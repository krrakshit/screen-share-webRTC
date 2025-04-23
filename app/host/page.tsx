"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import QRCode from "react-qr-code";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Monitor,
  Share2,
  Users,
  Mic,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Peer from "peerjs";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getRoomInfo, updateRoomInfo, clearRoomInfo } from "@/lib/roomCache";

export default function HostPage() {
  const [roomId, setRoomId] = useState<string>("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [viewers, setViewers] = useState<number>(0);
  const [hideQR, setHideQR] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const connectionMap = useRef(new Map<string, any>());
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  // Initialize room state from cache
  useEffect(() => {
    try {
      setIsLoading(true);
      
      // Get cached room info
      const cachedInfo = getRoomInfo();
      
      if (cachedInfo.roomId) {
        setRoomId(cachedInfo.roomId);
        setIsStreamActive(cachedInfo.isStreamActive);
        if (cachedInfo.viewers !== undefined) {
          setViewers(cachedInfo.viewers);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing from cache:", error);
      setIsLoading(false);
    }
  }, []);

  // Initialize or restore peer connection
  useEffect(() => {
    if (isLoading) return;

    try {
      // Use cached roomId or create a new one
      const savedRoomId = roomId || localStorage.getItem('roomId');
      const newPeer = savedRoomId ? new Peer(savedRoomId) : new Peer();

      setPeer(newPeer);

      newPeer.on("open", (id) => {
        setRoomId(id);
        
        // Update cache with new room ID
        updateRoomInfo({
          roomId: id,
          isStreamActive,
          viewers
        }, id);
      });

      newPeer.on("connection", (conn) => {
        // Keep track of connections by ID
        connectionMap.current.set(conn.peer, conn);
        
        // Update viewers count
        const newViewersCount = viewers + 1;
        setViewers(newViewersCount);
        
        // Update cache
        updateRoomInfo({
          viewers: newViewersCount
        }, roomId);

        conn.on("close", () => {
          // Remove connection from map
          connectionMap.current.delete(conn.peer);
          
          // Update viewers count
          const newViewersCount = viewers - 1;
          setViewers(newViewersCount);
          
          // Update cache
          updateRoomInfo({
            viewers: newViewersCount
          }, roomId);
        });

        // If there was an active stream before refresh, reconnect it
        if (isStreamActive) {
          toast.info("Reconnecting stream...", {
            description: "Reconnecting to previous stream",
          });
          startScreenShare(conn);
        } else {
          toast.info("New viewer connected", {
            description: "Click to start sharing your screen",
            duration: Infinity,
            action: {
              label: "Start Sharing",
              onClick: () => startScreenShare(conn),
            },
          });
        }
      });

      return () => {
        // Don't destroy peer on unmount if stream is active
        if (!isStreamActive) {
          newPeer.destroy();
        }
      };
    } catch (error) {
      console.error("Error initializing peer:", error);
    }
  }, [isLoading, roomId, isStreamActive, viewers]);

  const startScreenShare = async (conn: any) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setActiveStream(stream);
      setIsStreamActive(true);
      
      // Update cache
      updateRoomInfo({
        isStreamActive: true
      }, roomId);
      
      // Share with new connection
      peer?.call(conn.peer, stream);
      
      // Also share with all existing connections
      connectionMap.current.forEach((existingConn, peerId) => {
        if (peerId !== conn.peer) {
          peer?.call(peerId, stream);
        }
      });

      stream.getVideoTracks()[0].onended = () => {
        // Close all connections
        connectionMap.current.forEach((conn) => {
          try {
            conn.close();
          } catch (e) {
            console.error("Error closing connection:", e);
          }
        });
        
        // Stop stream
        stream.getTracks().forEach((track) => track.stop());
        setActiveStream(null);
        setIsStreamActive(false);
        
        // Update cache
        updateRoomInfo({
          isStreamActive: false
        }, roomId);
      };
    } catch (err) {
      console.error("Screen sharing error:", err);
      toast.error("Screen sharing error", {
        description: "Failed to start screen sharing. Please try again.",
      });
    }
  };

  const endSession = () => {
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      setActiveStream(null);
    }

    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    setViewers(0);
    setRoomId("");
    setIsStreamActive(false);
    
    // Clear room info from cache
    clearRoomInfo(roomId);

    toast.warning("Session ended", {
      description: "Your screen sharing session has been terminated.",
    });

    router.push("/");
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 flex-1">
        <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        <div className="h-96 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 flex-1">
      <Button asChild variant="outline">
        <Link href={"/"}>
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            Your Screen Sharing Room
          </CardTitle>
          <CardDescription>
            Share this room code with others to let them view your screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <code className="flex-1 py-2 px-3 bg-accent rounded-lg text-lg font-mono">
              {roomId || "Generating room code..."}
            </code>
            <Button
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                toast.success("Room code copied!");
              }}
            >
              <Copy className="size-4" />
            </Button>
            {navigator.share && (
              <Button
                size="icon"
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/join?room=${roomId}`;
                  try {
                    await navigator.share({
                      title: "Join my screen sharing session on XcreenShare",
                      text: "Click to join my screen sharing session",
                      url: shareUrl,
                    });
                  } catch (err) {
                    // @ts-expect-error error
                    if (err.name !== "AbortError") {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("Link copied to clipboard!");
                    }
                  }
                }}
              >
                <Share2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Current Viewers
              </span>
            </div>
            <span className="text-lg font-semibold">{viewers}</span>
          </div>

          {activeStream && (
            <>
              <div className="flex justify-end pt-4">
                <Button
                  variant="destructive"
                  onClick={endSession}
                  className="flex items-center gap-2"
                >
                  Stop sharing
                </Button>
              </div>
              
              {/* Audio Call Button - Only shown when streaming */}
              <div className="mt-4 border-t pt-4">
                <Button
                  className="w-full flex items-center gap-2"
                  variant="outline"
                  onClick={() => {
                    router.push(`/call?roomId=${roomId}&host=true`);
                  }}
                >
                  <Mic className="size-4" />
                  Start Audio Call Room
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Allow participants to connect via audio for real-time conversation while sharing your screen.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Button
        className="absolute -top-4 right-1 z-30 group hidden sm:flex"
        onClick={() => setHideQR(!hideQR)}
      >
        <span className="group-hover:block hidden">
          {hideQR ? "Show" : "Hide"} QR
        </span>
        {hideQR ? <ChevronLeft /> : <ChevronRight />}
      </Button>
      <div
        className={cn(
          "fixed top-4 right-1 bg-muted shadow p-2 rounded-lg sm:block hidden",
          hideQR && "sm:hidden"
        )}
      >
        <h2 className="text-center font-semibold mb-2">Scan to Join</h2>

        <QRCode value={`${baseUrl}/join?room=${roomId}`} size={256} />
      </div>
    </div>
  );
}