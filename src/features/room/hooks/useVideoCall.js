"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DEBUG } from "@/constants/config";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const TAG = "[call]";
const pcTag = (uid) => `${TAG}[PC:${String(uid).slice(0, 6)}]`;

const debug = (...args) => {
  if (DEBUG) debug(...args);
};

const warn = (...args) => {
  if (DEBUG) warn(...args);
};

const error = (...args) => {
  if (DEBUG) error(...args);
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
  // [Note] pcRoleRef: 'caller' (sent offer) or 'callee' (received offer) per peer.
  const pcRoleRef = useRef({});
  // [Note] isNegotiatingRef: per-peer lock that prevents concurrent createOffer() calls.
  // createOffer() is async — React can flush effects between it and setLocalDescription(),
  // causing two concurrent offers on the same PC which produces the m-line order mismatch.
  const isNegotiatingRef = useRef({});
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
        pc.onsignalingstatechange = null;
        pc.onicegatheringstatechange = null;
        pc.oniceconnectionstatechange = null;
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
      debug(
        `${pcTag(targetUserId)} cleanup — conn:${pc.connectionState} signal:${pc.signalingState}`,
      );
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.onsignalingstatechange = null;
      pc.onicegatheringstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
      delete pcRef.current[targetUserId];
    }
    delete iceQueuesRef.current[targetUserId];
    delete pcRoleRef.current[targetUserId];
    delete isNegotiatingRef.current[targetUserId];
  }, []);

  // [Note] injectTracksIntoPC matches senders by KIND not track ID.
  // New stream object references (React re-render) give tracks new IDs, so ID-matching
  // always called addTrack — creating new transceivers → m-line order mismatch on next offer.
  // replaceTrack swaps media on the existing transceiver with zero SDP side effects.
  const injectTracksIntoPC = useCallback((pc, stream, uid) => {
    const senders = pc.getSenders();
    debug(
      `${pcTag(uid)} injectTracks — senders:${senders.length} tracks:${stream.getTracks().length} signal:${pc.signalingState}`,
    );
    stream
      .getTracks()
      .sort((a, b) => a.kind.localeCompare(b.kind))
      .forEach((track) => {
        const existing = senders.find((s) => s.track?.kind === track.kind);
        if (existing) {
          if (existing.track?.id !== track.id) {
            debug(`${pcTag(uid)} replaceTrack kind=${track.kind}`);
            existing
              .replaceTrack(track)
              .catch((err) =>
                warn(`${pcTag(uid)} replaceTrack failed:`, err.message),
              );
          }
        } else {
          debug(`${pcTag(uid)} addTrack kind=${track.kind}`);
          pc.addTrack(track, stream);
        }
      });
  }, []);

  const getOrCreatePC = useCallback(
    (targetUserId) => {
      if (pcRef.current[targetUserId]) {
        const ex = pcRef.current[targetUserId];
        debug(
          `${pcTag(targetUserId)} getOrCreatePC REUSE — signal:${ex.signalingState} conn:${ex.connectionState}`,
        );
        return ex;
      }

      debug(`${pcTag(targetUserId)} getOrCreatePC CREATE`);
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current[targetUserId] = pc;
      iceQueuesRef.current[targetUserId] = [];

      const stream = localStreamRef.current;
      if (stream) {
        stream
          .getTracks()
          .sort((a, b) => a.kind.localeCompare(b.kind))
          .forEach((track) => {
            debug(
              `${pcTag(targetUserId)} addTrack-on-create kind=${track.kind}`,
            );
            pc.addTrack(track, stream);
          });
      } else {
        warn(
          `${pcTag(targetUserId)} no localStream at PC creation — tracks injected later`,
        );
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          debug(
            `${pcTag(targetUserId)} ICE candidate type=${e.candidate.type}`,
          );
          socketRef.current?.emit("CALL:ice", roomId, {
            candidate: e.candidate,
            to: targetUserId,
          });
        } else {
          debug(`${pcTag(targetUserId)} ICE gathering complete`);
        }
      };

      pc.ontrack = (e) => {
        debug(`${pcTag(targetUserId)} ontrack kind=${e.track.kind}`);
        setRemoteStreams((prev) => ({ ...prev, [targetUserId]: e.streams[0] }));
      };

      // [Note] Only destroy PC on terminal states (failed/closed).
      // "disconnected" is transient — ICE can self-heal without renegotiation.
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        debug(`${pcTag(targetUserId)} connectionState → ${state}`);
        if (["failed", "closed"].includes(state)) {
          debug(`${pcTag(targetUserId)} terminal — removing`);
          setRemoteStreams((prev) => {
            const n = { ...prev };
            delete n[targetUserId];
            return n;
          });
          delete pcRef.current[targetUserId];
          delete iceQueuesRef.current[targetUserId];
          delete pcRoleRef.current[targetUserId];
          delete isNegotiatingRef.current[targetUserId];
        }
      };

      pc.onsignalingstatechange = () =>
        debug(
          `${pcTag(targetUserId)} signalingState → ${pc.signalingState}`,
        );
      pc.onicegatheringstatechange = () =>
        debug(
          `${pcTag(targetUserId)} iceGatheringState → ${pc.iceGatheringState}`,
        );
      pc.oniceconnectionstatechange = () =>
        debug(
          `${pcTag(targetUserId)} iceConnectionState → ${pc.iceConnectionState}`,
        );

      return pc;
    },
    [roomId, socketRef],
  );

  const initiateCall = useCallback(
    async (targetUserId) => {
      const pc = getOrCreatePC(targetUserId);
      const signal = pc.signalingState;
      const hasRemote = !!pc.remoteDescription;
      const negotiating = !!isNegotiatingRef.current[targetUserId];

      debug(
        `${pcTag(targetUserId)} initiateCall — signal:${signal} hasRemote:${hasRemote} negotiating:${negotiating} role:${pcRoleRef.current[targetUserId]}`,
      );

      // Guard 1: wrong signaling state
      if (signal !== "stable") {
        warn(
          `${pcTag(targetUserId)} initiateCall SKIPPED — not stable (${signal})`,
        );
        return;
      }
      // Guard 2: handshake already complete, replaceTrack was sufficient
      if (hasRemote) {
        debug(
          `${pcTag(targetUserId)} initiateCall SKIPPED — handshake complete, replaceTrack sufficient`,
        );
        return;
      }
      // Guard 3: another createOffer() is already in flight on this PC.
      // React can flush effects between createOffer() and setLocalDescription() (both async),
      // so two concurrent offers can be created. The second setLocalDescription() fails with
      // "order of m-lines doesn't match" because Chrome compares it against the first offer.
      if (negotiating) {
        warn(
          `${pcTag(targetUserId)} initiateCall SKIPPED — offer already in flight (negotiation lock)`,
        );
        return;
      }

      isNegotiatingRef.current[targetUserId] = true;
      pcRoleRef.current[targetUserId] = "caller";

      try {
        debug(`${pcTag(targetUserId)} createOffer…`);
        const offer = await pc.createOffer();
        const mLines = (offer.sdp?.match(/^m=/gm) || []).length;
        debug(
          `${pcTag(targetUserId)} offer ready — mLines:${mLines} signal:${pc.signalingState}`,
        );

        if (pc.signalingState !== "stable") {
          warn(
            `${pcTag(targetUserId)} signalingState changed during createOffer (${pc.signalingState}) — aborting`,
          );
          return;
        }

        await pc.setLocalDescription(offer);
        debug(`${pcTag(targetUserId)} setLocalDescription(offer) OK`);
        socketRef.current?.emit("CALL:offer", roomId, {
          offer,
          to: targetUserId,
        });
      } catch (err) {
        error(
          `${pcTag(targetUserId)} initiateCall ERROR:`,
          err.name,
          err.message,
        );
        delete pcRoleRef.current[targetUserId];
      } finally {
        isNegotiatingRef.current[targetUserId] = false;
      }
    },
    [getOrCreatePC, roomId, socketRef],
  );

  const joinCall = useCallback(async () => {
    debug(`${TAG} joinCall — requesting media`);
    try {
      setIsJoining(true);
      isJoiningRef.current = true;
      if (!navigator?.mediaDevices?.getUserMedia)
        throw new Error("Requires secure context");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      debug(
        `${TAG} joinCall — stream tracks:`,
        stream.getTracks().map((t) => `${t.kind}:${t.id.slice(0, 8)}`),
      );
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsJoined(true);
      isJoinedRef.current = true;

      socketRef.current?.emit("CALL:join", roomId);
      socketRef.current?.emit("CALL:status", roomId, {
        micActive: true,
        camActive: true,
      });
      debug(`${TAG} joinCall — emitted CALL:join`);
    } catch (err) {
      error(`${TAG} joinCall ERROR:`, err.name, err.message);
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

  const leaveCall = useCallback(() => {
    debug(`${TAG} leaveCall`);
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
      const mLines = (offer.sdp?.match(/^m=/gm) || []).length;
      debug(`${pcTag(from)} handleOffer — mLines:${mLines}`);
      const pc = getOrCreatePC(from);
      const isPolite = userId < from;
      const collision = pc.signalingState !== "stable";
      debug(
        `${pcTag(from)} handleOffer — signal:${pc.signalingState} collision:${collision} isPolite:${isPolite}`,
      );

      if (collision && !isPolite) {
        warn(
          `${pcTag(from)} handleOffer — glare, impolite peer dropping offer`,
        );
        return;
      }

      pcRoleRef.current[from] = "callee";

      try {
        if (collision) {
          debug(`${pcTag(from)} handleOffer — rollback for glare`);
          await pc.setLocalDescription({ type: "rollback" });
          isNegotiatingRef.current[from] = false;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        debug(`${pcTag(from)} setRemoteDescription(offer) OK`);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        debug(`${pcTag(from)} setLocalDescription(answer) OK`);
        socketRef.current?.emit("CALL:answer", roomId, { answer, to: from });

        while (iceQueuesRef.current[from]?.length) {
          await pc.addIceCandidate(iceQueuesRef.current[from].shift());
        }
        debug(`${pcTag(from)} ICE queue drained`);
      } catch (err) {
        error(
          `${pcTag(from)} handleOffer ERROR:`,
          err.name,
          err.message,
        );
      }
    },
    [userId, getOrCreatePC, roomId, socketRef],
  );

  const handleAnswer = useCallback(async ({ from, answer }) => {
    const pc = pcRef.current[from];
    if (!pc) {
      warn(`${pcTag(from)} handleAnswer — no PC`);
      return;
    }
    debug(`${pcTag(from)} handleAnswer — signal:${pc.signalingState}`);
    if (pc.signalingState !== "have-local-offer") {
      warn(
        `${pcTag(from)} handleAnswer IGNORED — wrong state:${pc.signalingState}`,
      );
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      debug(`${pcTag(from)} setRemoteDescription(answer) OK`);
      while (iceQueuesRef.current[from]?.length) {
        await pc.addIceCandidate(iceQueuesRef.current[from].shift());
      }
      debug(`${pcTag(from)} ICE queue drained`);
    } catch (err) {
      error(
        `${pcTag(from)} handleAnswer ERROR:`,
        err.name,
        err.message,
      );
    }
  }, []);

  const handleIce = useCallback(async ({ from, candidate }) => {
    const pc = pcRef.current[from];
    if (!pc) return;
    try {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        debug(`${pcTag(from)} queuing ICE (no remoteDescription yet)`);
        iceQueuesRef.current[from] = iceQueuesRef.current[from] || [];
        iceQueuesRef.current[from].push(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      warn(`${pcTag(from)} ICE error:`, err.message);
    }
  }, []);

  // [Note] localStream useEffect: injects tracks into any PCs created before media was acquired,
  // then initiates the offer if no handshake has started. The negotiation lock (isNegotiatingRef)
  // prevents a second initiateCall from racing a concurrent one that was triggered by the
  // call_user_joined socket event and is already awaiting createOffer()/setLocalDescription().
  useEffect(() => {
    if (!localStream) return;
    debug(
      `${TAG} localStream useEffect — ${Object.keys(pcRef.current).length} PCs`,
    );
    Object.entries(pcRef.current).forEach(([uid, pc]) => {
      injectTracksIntoPC(pc, localStream, uid);
      const role = pcRoleRef.current[uid];
      const hasRemote = !!pc.remoteDescription;
      const negotiating = !!isNegotiatingRef.current[uid];
      debug(
        `${pcTag(uid)} post-inject — role:${role} hasRemote:${hasRemote} negotiating:${negotiating}`,
      );
      if (role !== "callee" && !hasRemote && !negotiating) {
        debug(`${pcTag(uid)} useEffect→initiateCall`);
        initiateCall(uid);
      } else {
        const reason =
          role === "callee"
            ? "callee role"
            : hasRemote
              ? "handshake complete"
              : "negotiation in flight";
        debug(`${pcTag(uid)} useEffect skip initiateCall — ${reason}`);
      }
    });
  }, [localStream, injectTracksIntoPC, initiateCall]);

  const handleSocketEvent = useCallback(
    async (event) => {
      const evtUserId = event.userId || event.from;
      debug(
        `${TAG} socketEvent type=${event.type} peer=${String(evtUserId || "").slice(0, 6)}`,
      );

      switch (event.type) {
        case "call_user_joined": {
          // [Note] Self-guard: React StrictMode double-mounts cause the same user to have two
          // socket connections in the same room. Socket B receives CALL:user_joined emitted by
          // Socket A (same userId). Initiating a PC to yourself creates a spurious concurrent
          // offer that races the real offer and causes the m-line order mismatch crash.
          if (event.userId === userId) {
            warn(
              `${TAG} call_user_joined IGNORED — received own userId (double-socket from StrictMode)`,
            );
            return;
          }
          setActiveCallers((prev) => new Set(prev).add(event.userId));
          if (isJoinedRef.current || isJoiningRef.current) {
            debug(
              `${TAG} call_user_joined — initiating to ${String(event.userId).slice(0, 6)}`,
            );
            initiateCall(event.userId);
          } else {
            debug(`${TAG} call_user_joined — not in call, skipping`);
          }
          break;
        }
        case "offer": {
          if (!isJoinedRef.current && !isJoiningRef.current) {
            debug(`${TAG} offer DROPPED — not in call`);
            break;
          }
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
          debug(`${TAG} user left — cleanup ${String(uid).slice(0, 6)}`);
          setActiveCallers((prev) => {
            const n = new Set(prev);
            n.delete(uid);
            return n;
          });
          setRemoteStreams((prev) => {
            const n = { ...prev };
            delete n[uid];
            return n;
          });
          setRemoteStatus((prev) => {
            const n = { ...prev };
            delete n[uid];
            return n;
          });
          cleanupPC(uid);
          break;
        }
      }
    },
    [userId, initiateCall, handleOffer, handleAnswer, handleIce, cleanupPC],
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
