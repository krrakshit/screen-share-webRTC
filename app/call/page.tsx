"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AudioCall from "@/components/AudioCall";
import { Button } from "@/components/ui/button";
import { Copy, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getRoomInfo, initializeRoomConnection } from "@/lib/roomCache";

export default function CallPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const isHost = searchParams.get("host") === "true";
  
  const [peerId, setPeerId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!roomId) return;
    
    try {
      setIsLoading(true);
      
      // Generate a unique peer ID based on room ID and role
      const generatePeerId = () => {
        return isHost ? `host-${roomId}` : `participant-${roomId}`;
      };
      
      // Initialize room connection in cache
      initializeRoomConnection(roomId, isHost);
      
      // Set peer ID for connection
      const newPeerId = generatePeerId();
      setPeerId(newPeerId);
      
      // Store in sessionStorage for quick recovery if page reloads
      sessionStorage.setItem('audioPeerId', newPeerId);
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing audio call:", error);
      setIsLoading(false);
    }
  }, [roomId, isHost]);
  
  // Recover from page reload
  useEffect(() => {
    const savedPeerId = sessionStorage.getItem('audioPeerId');
    if (savedPeerId && !peerId) {
      setPeerId(savedPeerId);
    }
  }, [peerId]);
  
  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard");
      setCopied(true);
      
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  if (!roomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <h1 className="text-2xl font-bold mb-4">Invalid Room</h1>
        <p className="mb-6">No room ID provided.</p>
        <Link href="/">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6"></div>
        <div className="h-12 w-64 bg-muted animate-pulse rounded mb-8"></div>
        <div className="h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href={isHost ? "/host" : "/join"}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {isHost ? "Host Room" : "Join Room"}
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">
          {isHost ? "Audio Room - Host" : "Audio Room - Participant"}
        </h1>
        
        <div className="flex items-center gap-2 mb-8">
          <p className="text-muted-foreground">
            Room ID: <span className="font-mono">{roomId}</span>
          </p>
          <Button variant="outline" size="icon" onClick={copyRoomId}>
            <Copy className={`h-4 w-4 ${copied ? "text-green-500" : ""}`} />
          </Button>
        </div>
      </div>
      
      <div className="bg-card border rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Audio Call</h2>
          <p className="text-muted-foreground mb-4">
            {isHost 
              ? "Wait for participants to join your audio call. You'll be able to hear them and they can hear you." 
              : "Connect to the host's audio call. You'll be able to speak and listen in real-time."}
          </p>
        </div>
        
        {peerId && (
          <AudioCall 
            peerId={peerId}
            remotePeerId={isHost ? undefined : `host-${roomId}`}
            isHost={isHost}
          />
        )}
        
        <div className="mt-8 p-4 bg-muted/50 rounded-md">
          <h3 className="text-sm font-medium mb-2">Audio Call Info</h3>
          <p className="text-sm text-muted-foreground">
            {isHost 
              ? "This is a two-way audio connection. Participants can speak to you and listen to you during the screen sharing session." 
              : "This is a two-way audio connection. You can speak to the host and listen to them while viewing the shared screen."}
          </p>
        </div>
      </div>
    </div>
  );
} 