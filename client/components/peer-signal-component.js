import React from 'React'
import socket from '../socket'

const sendMessage = (message) => {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}


class PeerSignalComponent extends React.Component{
  constructor(props){
    super(props)

    this.localStream = null
    this.remoteStream = null

    this.pc = null

    this.isChannelReady = false;
    this.isInitiator = false;
    this.isStarted = false;
    this.turnReady = false;

    this.state = {
      roomId: props.match.params.roomId
    }

    this.refLocalVideo = React.createRef()
    this.refRemoteVideo = React.createRef()

    this.servers = {
      iceServers: [{ url: 'stun:stun.l.google.com:19302' }]
    }
    
    this.mediaConstraints = {
      audio: true,
      video: true,
    }

    this.sdpConstraints = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    };

    if (location.hostname !== 'localhost') {
      this.requestTurn(
        'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
      );
    }
  }

  toggleLocalStream = () => {
    if(this.localStream){
      console.log('Message from client: Asking to join room ' + room);
      socket.emit('create or join', this.state.roomId);
      this.localStream = null
      this.refLocalVideo.current.srcObject = this.localStream
    }else{
      this.getUserMedia()
    }
  }

  async getUserMedia(){
    try{
      this.localStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints)
      this.refLocalVideo.current.srcObject = this.localStream
      sendMessage('got user media');
      if (this.Initiator) {
        this.maybeStart();
      }
    }catch(err){
      console.error(err)
    }
  }

  maybeStart = () => {
    console.log('>>>>>>> maybeStart() ', this.isStarted, this.localStream, this.isChannelReady);
    if (!this.isStarted && typeof this.localStream !== 'undefined' && this.isChannelReady) {
      console.log('>>>>>> creating peer connection');
      this.createPeerConnection();
      this.pc.addStream(localStream);
      this.isStarted = true;
      console.log('isInitiator', this.isInitiator);
      if (this.isInitiator) {
        this.doCall();
      }
    }
  }


  doCall = () => {
    this.pc.createOffer(this.setLocalAndSendMessage, this.handleCreateOfferError);
  }

  doAnswer = () => {
    console.log('Sending answer to peer.');
    this.pc.createAnswer().then(
      this.setLocalAndSendMessage,
      this.onCreateSessionDescriptionError
    );
  }

  createPeerConnection = () => {
    try {
      this.pc = new RTCPeerConnection(null);
      this.pc.onicecandidate = this.handleIceCandidate;
      this.pc.onaddstream    = this.handleRemoteStreamAdded;
      this.pc.onremovestream = this.handleRemoteStreamRemoved;
    } catch (e) {
      alert('Cannot create RTCPeerConnection object.');
      return;
    }
  }

  handleIceCandidate = (event) => {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
      console.log('End of candidates.');
    }
  }

  handleRemoteStreamAdded = (event) => {
    console.log('Remote stream added.');
    this.remoteStream = event.stream;
    this.refRemoteVideo.current.srcObject = this.remoteStream;
  }

  handleRemoteStreamRemoved = (event) => {
    console.log('Remote stream removed. Event: ', event);
  }

  handleCreateOfferError = (event) => {
    console.log('createOffer() error: ', event);
  }

  requestTurn = (turnUrl) => {
    var turnExists = false;
    for (let i in this.servers.iceServers) {
      if (this.servers.iceServers[i].urls.substr(0, 5) === 'turn:') {
        turnExists = true;
        this.turnReady = true;
        break;
      }
    }
    if (!turnExists) {
      console.log('Getting TURN server from ', turnURL);
      // No TURN server. Get one from computeengineondemand.appspot.com:
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var turnServer = JSON.parse(xhr.responseText);
          console.log('Got TURN server: ', turnServer);
          this.servers.iceServers.push({
            'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
            'credential': turnServer.password
          });
          this.turnReady = true;
        }
      };
      xhr.open('GET', turnURL, true);
      xhr.send();
    }
  }

  setLocalAndSendMessage = (sessionDescription) => {
    this.pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription);
  }

  onCreateSessionDescriptionError = (error) => {
    trace('Failed to create session description: ' + error.toString());
  }

  hangup = () => {
    console.log('Hanging up.');
    this.stop();
    this.sendMessage('bye');
  }
  
  handleRemoteHangup = () => {
    console.log('Session terminated.');
    this.stop();
    this.isInitiator = false;
  }
  
  stop = () => {
    this.isStarted = false;
    this.pc.close();
    this.pc = null;
  }

  render(props){
    return(
      <div>
        <h1>
          This is a realTime communication using WebRTC
        </h1>

        <div>
          <video ref={this.refLocalVideo} autoPlay muted /> 
          <video ref={this.refRemoteVideo} autoPlay muted /> 
        </div>

        <button onClick={this.toggleLocalStream}>
          stream
        </button>

      </div>
    )
  }

}

export default PeerSignalComponent