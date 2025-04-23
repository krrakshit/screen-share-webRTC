"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Mic, Loader2 } from "lucide-react";
import Link from "next/link";
import Peer from "peerjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { initializeRoomConnection } from "@/lib/roomCache";

export default function JoinPage() {
  const [roomId, setRoomId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [loadingCache, setLoadingCache] = useState(true);
  const [cachedConnection, setCachedConnection] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load room ID from search params
  useEffect(() => {
    if (searchParams.get("room")) {
      const roomFromParams = searchParams.get("room") || "";
      setRoomId(roomFromParams);
      
      // Check if we have recently connected to this room
      const lastConnectedRoom = localStorage.getItem('lastJoinedRoom');
      if (lastConnectedRoom === roomFromParams) {
        setCachedConnection(true);
      }
    }
    setLoadingCache(false);
  }, [searchParams.get("room")]);

  // Auto-connect to cached room
  useEffect(() => {
    if (cachedConnection && roomId && !isConnecting && !isConnected && !loadingCache) {
      joinRoom();
    }
  }, [cachedConnection, roomId, isConnecting, isConnected, loadingCache]);

  const joinRoom = () => {
    if (!roomId.trim()) {
      toast.error("Room code required", {
        description: "Please enter a valid room code",
      });
      return;
    }

    setIsConnecting(true);
    
    // Store this room ID for faster connections in the future
    localStorage.setItem('lastJoinedRoom', roomId);
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", () => {
      const conn = peer.connect(roomId, {
        reliable: true,
        metadata: { joinTime: Date.now() }
      });
      connectionRef.current = conn;

      conn.on("open", () => {
        setIsConnected(true);
        setIsConnecting(false);
        
        // Register connection with our cache system
        initializeRoomConnection(roomId, false);
        
        toast.success("Connected!", {
          description: "Waiting for host to share their screen...",
        });
      });

      peer.on("call", (call : any) => {
        call.answer();
        call.on("stream", (remoteStream : any) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            videoRef.current.play().catch(console.error);
            setIsStreamActive(true);
          }
        });
        
        // Handle call ended
        call.on("close", () => {
          setIsStreamActive(false);
        });
      });

      conn.on("close", () => {
        cleanup();
      });
      
      conn.on("error", (err: any) => {
        console.error("Connection error:", err);
        cleanup();
      });
    });

    peer.on("error", (err) => {
      console.error("Peer error:", err);
      setIsConnecting(false);
      toast.error("Connection failed", {
        description:
          "Could not connect to the room. Please check the room code and try again.",
      });
    });
  };
  
  // Clean up connections and state
  const cleanup = () => {
    setIsConnecting(false);
    setIsConnected(false);
    setIsStreamActive(false);
    
    // Clean up video
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    
    toast.warning("Disconnected", {
      description: "The host has ended the session",
    });
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Properly close connections when component unmounts
      if (connectionRef.current) {
        try {
          connectionRef.current.close();
        } catch (e) {
          console.error("Error closing connection:", e);
        }
      }
      
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      
      // Clean up video
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  // Loading state while checking cache
  if (loadingCache) {
    return (
      <div className="mx-auto space-y-8 flex-1 max-w-2xl">
        <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        <div className="h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto space-y-8 flex-1",
        isConnected ? "max-w-6xl" : "max-w-2xl"
      )}
    >
      <Button variant="outline" asChild>
        <Link href={"/"}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Join a Room
          </CardTitle>
          <CardDescription>
            Enter the room code to join and view the shared screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <div className="space-y-4">
              <Input
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={isConnecting}
              />
              <Button
                className="w-full"
                onClick={joinRoom}
                disabled={isConnecting || !roomId.trim()}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Join Room"
                )}
              </Button>
              
              {cachedConnection && !isConnecting && (
                <p className="text-xs text-muted-foreground text-center">
                  Recently connected to this room. Auto-connecting...
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                ref={videoContainerRef}
                className="relative aspect-video bg-muted-foreground rounded-lg overflow-hidden group "
              >
                <video
                  ref={videoRef}
                  className="size-full object-contain bg-gradient-to-br from-background to-muted"
                  autoPlay
                  playsInline
                  controls
                />
              </div>
              
              {/* Audio Call Button - Only shown when stream is active */}
              {isStreamActive && (
                <div className="mt-4 border-t pt-4">
                  <Button
                    className="w-full flex items-center gap-2"
                    variant="outline"
                    onClick={() => {
                      router.push(`/call?roomId=${roomId}&host=false`);
                    }}
                  >
                    <Mic className="size-4" />
                    Join Audio Call
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Connect via audio for real-time conversation while viewing the shared screen.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}