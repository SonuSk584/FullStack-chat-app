import { BsTelephone, BsCameraVideo, BsTelephoneX } from 'react-icons/bs';

const CallNotification = ({ caller, callType, onAccept, onReject }) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="alert alert-info shadow-lg">
        <div className="flex items-center gap-4">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={caller.profilePic || "/avatar.png"} alt="caller" />
            </div>
          </div>
          <div>
            <h3 className="font-bold">{caller.fullName}</h3>
            <p className="text-sm">Incoming {callType} call...</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onAccept} 
              className="btn btn-circle btn-success btn-sm"
            >
              {callType === 'video' ? <BsCameraVideo size={16} /> : <BsTelephone size={16} />}
            </button>
            <button 
              onClick={onReject} 
              className="btn btn-circle btn-error btn-sm"
            >
              <BsTelephoneX size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;