"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useVideoCall({ roomId, userId, socketRef, addToast }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [activeCallers, setActiveCallers] = useState(new Set());
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [remoteStatus, setRemoteStatus] = useState({});

  const pcRef = useRef({});
  const iceQueuesRef = useRef({});
  const localStreamRef = useRef(null);
  // [Note] pcRoleRef tracks whether we are 'caller' (sent offer) or 'callee' (received offer) per peer.
  // This prevents initiateCall from re-offering on callee PCs, which causes m-line order mismatch.
  const pcRoleRef = useRef({});
  // [Note] Stable refs mirror isJoined/isJoining state — prevents stale closures in socket event handlers
  const isJoinedRef = useRef(false);
  const isJoiningRef = useRef(false);

  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);
  useEffect(() => {
    isJoiningRef.current = isJoining;
  }, [isJoining]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(pcRef.current).forEach((pc) => {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      });
    };
  }, []);

  const broadcastStatus = useCallback(
    (mic, cam) => {
      socketRef.current?.emit("CALL:status", roomId, {
        micActive: mic,
        camActive: cam,
      });
    },
    [roomId, socketRef],
  );

  // [Note] toggleMic/toggleCam read from localStreamRef to avoid stale state on rapid toggles
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audio = stream.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      setMicActive(audio.enabled);
      broadcastStatus(
        audio.enabled,
        stream.getVideoTracks()[0]?.enabled ?? true,
      );
    }
  }, [broadcastStatus]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const video = stream.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      setCamActive(video.enabled);
      broadcastStatus(
        stream.getAudioTracks()[0]?.enabled ?? true,
        video.enabled,
      );
    }
  }, [broadcastStatus]);

  const cleanupPC = useCallback((targetUserId) => {
    const pc = pcRef.current[targetUserId];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      delete pcRef.current[targetUserId];
    }
    delete iceQueuesRef.current[targetUserId];
    delete pcRoleRef.current[targetUserId];
  }, []);

  // [Note] injectTracksIntoPC matches senders by KIND, not track ID.
  // When localStream's object reference changes (React re-render), new tracks have new IDs,
  // so track-ID matching would always call addTrack — creating new transceivers and
  // causing the "m-line order doesn't match" InvalidAccessError on the next createOffer().
  // replaceTrack swaps media on the existing transceiver with zero SDP side effects.
  const injectTracksIntoPC = useCallback((pc, stream) => {
    const senders = pc.getSenders();
    stream
      .getTracks()
      .sort((a, b) => a.kind.localeCompare(b.kind))
      .forEach((track) => {
        const existing = senders.find((s) => s.track?.kind === track.kind);
        if (existing) {
          existing.replaceTrack(track).catch(() => {});
        } else {
          pc.addTrack(track, stream);
        }
      });
  }, []);

  const getOrCreatePC = useCallback(
    (targetUserId) => {
      if (pcRef.current[targetUserId]) return pcRef.current[targetUserId];

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current[targetUserId] = pc;
      iceQueuesRef.current[targetUserId] = [];

      const stream = localStreamRef.current;
      if (stream) {
        // [Note] Sort tracks by kind (audio < video) to guarantee a stable m-line order across all PCs
        stream
          .getTracks()
          .sort((a, b) => a.kind.localeCompare(b.kind))
          .forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit("CALL:ice", roomId, {
            candidate: e.candidate,
            to: targetUserId,
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStreams((prev) => ({ ...prev, [targetUserId]: e.streams[0] }));
      };

      // [Note] Only cleanup on terminal states (failed/closed).
      // "disconnected" is transient — ICE restarts can recover it automatically.
      // Destroying the PC on "disconnected" forces full renegotiation whose new m-line
      // order may not match the remote's locked expectation, causing InvalidAccessError.
      pc.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(pc.connectionState)) {
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[targetUserId];
            return next;
          });
          delete pcRef.current[targetUserId];
          delete iceQueuesRef.current[targetUserId];
          delete pcRoleRef.current[targetUserId];
        }
      };

      return pc;
    },
    [roomId, socketRef],
  );

  const initiateCall = useCallback(
    async (targetUserId) => {
      const pc = getOrCreatePC(targetUserId);
      if (pc.signalingState !== "stable") return;
      // [Note] Mark as caller so the localStream useEffect does not re-offer on callee PCs
      pcRoleRef.current[targetUserId] = "caller";
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("CALL:offer", roomId, {
          offer,
          to: targetUserId,
        });
      } catch (err) {
        console.error("[call] Initiation error:", err);
      }
    },
    [getOrCreatePC, roomId, socketRef],
  );

  const joinCall = useCallback(async () => {
    try {
      setIsJoining(true);
      isJoiningRef.current = true;
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Requires secure context");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsJoined(true);
      isJoinedRef.current = true;

      socketRef.current?.emit("CALL:join", roomId);
      socketRef.current?.emit("CALL:status", roomId, {
        micActive: true,
        camActive: true,
      });
      // [Note] No initiateCall loop here — existing callers hear CALL:user_joined and initiate to us.
      // This avoids creating peer connections with room participants who never clicked "Join Call".
    } catch (err) {
      console.error("[call] Join error:", err);
      const msg =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera/mic access denied"
          : err.message?.includes("secure") || err.message?.includes("context")
            ? "Video call requires HTTPS"
            : "Could not start video call";
      addToast?.(msg, "error");
    } finally {
      setIsJoining(false);
      isJoiningRef.current = false;
    }
  }, [roomId, socketRef, addToast]);

  // [Note] leaveCall uses localStreamRef internally — localStream state intentionally excluded from deps
  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setIsJoined(false);
    isJoinedRef.current = false;
    Object.keys(pcRef.current).forEach((uid) => cleanupPC(uid));
    setRemoteStreams({});
    setRemoteStatus({});
    setActiveCallers(new Set());
    socketRef.current?.emit("CALL:leave", roomId);
  }, [roomId, socketRef, cleanupPC]);

  const handleOffer = useCallback(
    async ({ from, offer }) => {
      const pc = getOrCreatePC(from);

      const isPolite = userId < from;
      const collision = pc.signalingState !== "stable";
      if (collision && !isPolite) return;

      // [Note] Mark as callee so the localStream useEffect never calls initiateCall on this PC,
      // which would generate an offer whose m-line order may not match the established answer.
      pcRoleRef.current[from] = "callee";

      try {
        if (collision) {
          await pc.setLocalDescription({ type: "rollback" });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("CALL:answer", roomId, { answer, to: from });

        while (iceQueuesRef.current[from]?.length) {
          await pc.addIceCandidate(iceQueuesRef.current[from].shift());
        }
      } catch (err) {
        console.error("[call] Signal error (Offer):", err);
      }
    },
    [userId, getOrCreatePC, roomId, socketRef],
  );

  const handleAnswer = useCallback(async ({ from, answer }) => {
    const pc = pcRef.current[from];
    if (!pc) return;
    // [Note] Guard: only accept answer when we have a pending local offer — prevents InvalidStateError
    if (pc.signalingState !== "have-local-offer") {
      console.warn(
        `[call] Received answer from ${from} in state: ${pc.signalingState}. Ignoring.`,
      );
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      while (iceQueuesRef.current[from]?.length) {
        await pc.addIceCandidate(iceQueuesRef.current[from].shift());
      }
    } catch (err) {
      console.error("[call] Signal error (Answer):", err);
    }
  }, []);

  const handleIce = useCallback(async ({ from, candidate }) => {
    const pc = pcRef.current[from];
    if (!pc) return;
    try {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // [Note] Queue candidates that arrive before remote description is set — flushed post-handshake
        iceQueuesRef.current[from] = iceQueuesRef.current[from] || [];
        iceQueuesRef.current[from].push(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn("[call] ICE error:", err);
    }
  }, []);

  // [Note] Track injection uses injectTracksIntoPC (replaceTrack by kind) instead of addTrack by ID.
  // When React re-renders create a new localStream object reference, track IDs change even if the
  // underlying device is the same. Matching by kind + replaceTrack keeps the existing transceiver
  // structure intact — no new m-lines, no InvalidAccessError on the next createOffer().
  // Only caller-role PCs renegotiate; callee PCs must never re-offer (their m-line order is
  // locked by the remote peer's original offer).
  useEffect(() => {
    if (!localStream) return;
    Object.entries(pcRef.current).forEach(([uid, pc]) => {
      injectTracksIntoPC(pc, localStream);
      if (pcRoleRef.current[uid] !== "callee") {
        initiateCall(uid);
      }
    });
  }, [localStream, injectTracksIntoPC, initiateCall]);

  const handleSocketEvent = useCallback(
    async (event) => {
      switch (event.type) {
        // [Note] "user_joined" (room join) intentionally NOT handled — only CALL:user_joined triggers negotiation.
        // Reacting to every room join would create orphaned peer connections with non-call participants.
        case "call_user_joined": {
          setActiveCallers((prev) => new Set(prev).add(event.userId));
          // [Note] Read joined state via refs — state values are stale inside this memoized callback
          if (isJoinedRef.current || isJoiningRef.current) {
            initiateCall(event.userId);
          }
          break;
        }
        case "offer": {
          // [Note] Guard: drop offers if we're not in the call — prevents ghost connections for passive viewers
          if (!isJoinedRef.current && !isJoiningRef.current) break;
          setActiveCallers((prev) => new Set(prev).add(event.from));
          await handleOffer(event);
          break;
        }
        case "answer":
          await handleAnswer(event);
          break;
        case "ice":
          await handleIce(event);
          break;
        case "status":
          setRemoteStatus((prev) => ({
            ...prev,
            [event.from]: {
              micActive: event.micActive,
              camActive: event.camActive,
            },
          }));
          break;
        case "user_left":
        case "call_user_left": {
          const uid = event.userId || event.from;
          setActiveCallers((prev) => {
            const next = new Set(prev);
            next.delete(uid);
            return next;
          });
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
          setRemoteStatus((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
          cleanupPC(uid);
          break;
        }
      }
      // [Note] isJoined/isJoining intentionally excluded from deps — read via stable refs to prevent handler churn
    },
    [initiateCall, handleOffer, handleAnswer, handleIce, cleanupPC],
  );

  return {
    isJoined,
    isJoining,
    isCalling: activeCallers.size > 0,
    localStream,
    remoteStreams,
    remoteStatus,
    joinCall,
    leaveCall,
    micActive,
    camActive,
    toggleMic,
    toggleCam,
    handleSocketEvent,
  };
}
