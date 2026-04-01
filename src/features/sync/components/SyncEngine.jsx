"use client";

import { useEffect } from "react";
import { useRoomSocket } from "../../room/hooks/useRoomSocket";

export default function SyncEngine(props) {
  const { sendRef, socketRef: externalSocketRef } = props;
  const { send, socketRef } = useRoomSocket(props);

  useEffect(() => {
    if (externalSocketRef) externalSocketRef.current = socketRef.current;
  }, [socketRef.current, externalSocketRef]);

  useEffect(() => {
    if (!sendRef) return;
    sendRef.current = (msg) => {
      const typeMap = {
        chat: () => send("chat", { text: msg.text, dataUrl: msg.dataUrl }),
        play: () => send("CMD:play", { videoTS: msg.currentTime }),
        pause: () => send("CMD:pause", { videoTS: msg.currentTime }),
        seek: () => send("CMD:seek", msg.currentTime),
        speed: () => send("CMD:playbackRate", { rate: msg.rate, videoTS: msg.currentTime }),
        change_video: () => send("CMD:host", {
          video: msg.videoUrl,
          videoUrl: msg.videoUrl,
          subtitleUrl: msg.subtitleUrl,
          paused: false,
          token: props.hostToken,
        }),
        kick: () => send("CMD:kick", { targetUserId: msg.targetUserId }),
        transfer_host: () => send("CMD:transferHost", { targetUserId: msg.targetUserId }),
        toggle_host_controls: () => send("CMD:lock"),
        toggle_strict_video_url_mode: () => send("CMD:strictVideoUrlMode"),
        set_subtitle: () => send("CMD:subtitle", msg.url),
        set_name: () => send("CMD:setName", { username: msg.username }),
        set_password: () => send("CMD:setPassword", { password: msg.password }),
        typing: () => send("CMD:typing"),
      };
      
      const handler = typeMap[msg.type];
      if (handler) handler();
      else send(msg.type, msg);
    };
  }, [send, sendRef, props.hostToken]);

  return null;
}
