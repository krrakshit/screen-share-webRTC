import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { toast } from "sonner";

interface AudioCallProps {
  peerId: string;
  remotePeerId?: string;
  isHost: boolean;
  onCallEnd?: () => void;
}

export default function AudioCall({ peerId, remotePeerId, isHost, onCallEnd }: AudioCallProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const peerInstance = useRef<any>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const callInstance = useRef<any>(null);
  
  // Initialize peer connection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initPeer = async () => {
      const { default: Peer } = await import('peerjs');
      
      if (!peerInstance.current) {
        peerInstance.current = new Peer(peerId);
        
        peerInstance.current.on('open', (id: string) => {
          console.log('Peer connected with ID:', id);
          toast.success("Audio connection ready");
          
          // If host, wait for incoming call
          if (isHost) {
            peerInstance.current.on('call', (call: any) => {
              setupCallAnswer(call);
            });
          }
        });
        
        peerInstance.current.on('error', (err: any) => {
          console.error('Peer error:', err);
          toast.error("Connection error");
        });
      }
    };
    
    initPeer();
    
    return () => {
      if (audioStream.current) {
        audioStream.current.getTracks().forEach(track => track.stop());
      }
      
      if (callInstance.current) {
        callInstance.current.close();
      }
      
      if (peerInstance.current) {
        peerInstance.current.destroy();
      }
    };
  }, [peerId, isHost]);
  
  // Get user media and handle call setup
  const setupUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false // Ensure only audio is requested
      });
      audioStream.current = stream;
      return stream;
    } catch (err) {
      console.error('Failed to get user media', err);
      toast.error("Could not access microphone");
      throw err;
    }
  };
  
  // Answer incoming call
  const setupCallAnswer = async (call: any) => {
    try {
      setIsConnecting(true);
      const stream = await setupUserMedia();
      
      call.answer(stream); // Send our audio stream to the caller
      callInstance.current = call;
      
      call.on('stream', (remoteStream: MediaStream) => {
        handleRemoteStream(remoteStream);
      });
      
      call.on('close', () => {
        setIsCallActive(false);
        handleCallEnd();
      });
      
      call.on('error', (err: any) => {
        console.error('Call error:', err);
        toast.error("Call error occurred");
        setIsCallActive(false);
      });
      
      setIsCallActive(true);
      setIsConnecting(false);
      toast.success("Participant connected to audio call");
    } catch (err) {
      setIsConnecting(false);
      console.error('Error answering call:', err);
    }
  };
  
  // Initiate call to remote peer
  const initiateCall = async () => {
    if (!remotePeerId || !peerInstance.current) return;
    
    try {
      setIsConnecting(true);
      const stream = await setupUserMedia();
      
      // Call the host with our audio stream
      const call = peerInstance.current.call(remotePeerId, stream);
      callInstance.current = call;
      
      call.on('stream', (remoteStream: MediaStream) => {
        handleRemoteStream(remoteStream);
      });
      
      call.on('close', () => {
        setIsCallActive(false);
        handleCallEnd();
      });
      
      call.on('error', (err: any) => {
        console.error('Call error:', err);
        toast.error("Call error occurred");
        setIsCallActive(false);
        setIsConnecting(false);
      });
      
      setIsCallActive(true);
      setIsConnecting(false);
    } catch (err) {
      setIsConnecting(false);
      console.error('Error initiating call:', err);
    }
  };
  
  // Add remote stream to audio element
  const handleRemoteStream = (remoteStream: MediaStream) => {
    const audioElement = document.createElement('audio');
    audioElement.srcObject = remoteStream;
    audioElement.autoplay = true;
    audioElement.setAttribute('data-peer-audio', 'true');
    document.body.appendChild(audioElement);
    
    toast.success(isHost ? "Participant joined audio call" : "Connected to host's audio");
  };
  
  // End call
  const endCall = () => {
    if (callInstance.current) {
      callInstance.current.close();
    }
    
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
    
    setIsCallActive(false);
    handleCallEnd();
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (audioStream.current) {
      const audioTracks = audioStream.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      
      toast.success(isMuted ? "Microphone unmuted" : "Microphone muted");
    }
  };
  
  const handleCallEnd = () => {
    if (onCallEnd) {
      onCallEnd();
    }
    
    const audioElements = document.querySelectorAll('audio[data-peer-audio="true"]');
    audioElements.forEach(el => el.remove());
  };
  
  return (
    <div className="flex items-center gap-3">
      {!isHost && !isCallActive && (
        <Button 
          onClick={initiateCall} 
          variant="outline"
          disabled={isConnecting}
          className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
        >
          {isConnecting ? "Connecting..." : "Start Audio Call"}
        </Button>
      )}
      
      {isCallActive && (
        <>
          <Button 
            onClick={toggleMute} 
            variant="outline" 
            size="icon"
            className={isMuted ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </Button>
          
          <Button 
            onClick={endCall}
            variant="outline"
            size="icon"
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
          >
            <PhoneOff size={18} />
          </Button>
        </>
      )}

      {isHost && !isCallActive && (
        <div className="text-xs text-muted-foreground">
          Waiting for participants to join audio call...
        </div>
      )}
    </div>
  );
}