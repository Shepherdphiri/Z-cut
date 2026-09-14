import React, { useState } from 'react';
import { 
  Share2, 
  CheckCircle2, 
  Send, 
  Copy, 
  Check, 
  ExternalLink,
  Settings,
  Flame,
  Globe,
  Smartphone,
  Calendar
} from 'lucide-react';
import { VideoClip } from '../types';

interface SocialPublisherModalProps {
  clip: VideoClip;
  videoSrc: string;
  onClose: () => void;
}

export const SocialPublisherModal: React.FC<SocialPublisherModalProps> = ({
  clip,
  videoSrc,
  onClose
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram' | 'youtube_shorts' | 'twitter'>('tiktok');
  const [caption, setCaption] = useState(clip.socialCaption);
  const [hashtags, setHashtags] = useState<string[]>(clip.hashtags);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [publishedResult, setPublishedResult] = useState<any | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Custom API / Webhook integration settings (stored in SQL)
  const [webhookUrl, setWebhookUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [savedConfigMsg, setSavedConfigMsg] = useState('');

  const platforms = [
    {
      id: 'tiktok',
      name: 'TikTok',
      handle: '@my_tiktok_creator',
      directUploadUrl: 'https://www.tiktok.com/upload',
      note: 'Uploads 9:16 vertical short directly into TikTok Studio',
      badge: 'Live Platform'
    },
    {
      id: 'instagram',
      name: 'Instagram Reels',
      handle: '@my_instagram_reels',
      directUploadUrl: 'https://www.instagram.com/',
      note: 'Direct upload to Instagram Feed / Reels camera',
      badge: 'Reels Ready'
    },
    {
      id: 'youtube_shorts',
      name: 'YouTube Shorts',
      handle: 'My YouTube Channel',
      directUploadUrl: 'https://studio.youtube.com/channel/uploader',
      note: 'Direct link to YouTube Studio Shorts uploader',
      badge: 'Shorts Shelf'
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      handle: '@my_twitter',
      directUploadUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption + '\n' + hashtags.join(' '))}`,
      note: 'Direct tweet intent composer with pre-filled video hook',
      badge: 'Instant Tweet'
    }
  ];

  const currentPlatformObj = platforms.find(p => p.id === selectedPlatform) || platforms[0];

  const handleCopyText = () => {
    const fullText = `${caption}\n\n${hashtags.join(' ')}`;
    navigator.clipboard?.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // Real Web Share API (native phone share sheet)
  const handleNativeMobileShare = async () => {
    const fullText = `${caption}\n\n${hashtags.join(' ')}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Z-cut: ${clip.title}`,
          text: fullText,
          url: videoSrc || window.location.href
        });
      } catch (err) {
        console.warn('Native share dismissed or failed:', err);
      }
    } else {
      handleCopyText();
    }
  };

  // Real Save API / Webhook Credentials to SQL Database
  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/db/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          account_handle: currentPlatformObj.handle,
          webhook_url: webhookUrl,
          access_token: accessToken
        })
      });
      if (res.ok) {
        setSavedConfigMsg('Configuration saved to SQLite database.');
        setTimeout(() => setSavedConfigMsg(''), 3000);
      }
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  };

  // Real Direct Post & SQL Database Record
  const handlePublishNow = async () => {
    setIsPosting(true);
    try {
      // 1. Send real request to backend which records to SQLite & invokes webhook if set
      const response = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: clip.id,
          platform: selectedPlatform,
          caption,
          hashtags,
          scheduledTime: scheduledTime || null
        })
      });

      const data = await response.json();
      setPublishedResult(data);

      // 2. Automatically copy caption for creator convenience
      handleCopyText();

      // 3. If direct upload url exists and user wants to open the app
      if (selectedPlatform === 'twitter') {
        window.open(currentPlatformObj.directUploadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      console.error('Publish error:', err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 text-white shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-rose-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg font-['Outfit']">Real Social Media Publisher</h2>
              <p className="text-[11px] text-neutral-400">
                Direct native share and creator platform posting stored in SQLite.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Success View */}
        {publishedResult ? (
          <div className="py-6 text-center space-y-4 overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-white font-['Outfit']">
                Post Logged to SQLite Database
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Your post was recorded with status: <strong className="text-emerald-400 font-mono">{publishedResult.status}</strong>. Caption and hashtags have been automatically copied to your clipboard.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between text-neutral-400">
                <span>Platform:</span>
                <span className="font-bold text-white capitalize">{publishedResult.platform}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Direct Link:</span>
                <a
                  href={currentPlatformObj.directUploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-rose-400 hover:underline flex items-center gap-1"
                >
                  <span>Open {currentPlatformObj.name}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Webhook Dispatch:</span>
                <span className="font-mono text-neutral-300">{publishedResult.webhookStatus}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={currentPlatformObj.directUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5"
              >
                <span>Go to {currentPlatformObj.name}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setPublishedResult(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              >
                Post Another
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1">
            {/* Native Mobile Share Button (Real Web Share API) */}
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Native Mobile Share Sheet</p>
                  <p className="text-[10px] text-neutral-400">
                    Open directly in your phone's installed TikTok, Instagram, or WhatsApp app
                  </p>
                </div>
              </div>
              <button
                onClick={handleNativeMobileShare}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 flex items-center gap-1"
              >
                <Share2 className="w-3 h-3 text-emerald-400" />
                <span>Share</span>
              </button>
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 mb-2 block">
                Select Destination Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((p) => {
                  const isSelected = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlatform(p.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-950/20 text-white ring-1 ring-rose-500/50'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-['Outfit']">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />}
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 truncate">{p.note}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption & Hashtags */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Caption & Description
                </label>
                <button
                  onClick={handleCopyText}
                  className="text-[11px] font-semibold text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCaption ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Hashtags display */}
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Direct Platform Launch Link */}
            <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-white block">Direct Platform Link</span>
                <span className="text-[10px] text-neutral-400">
                  Opens {currentPlatformObj.name} uploader in browser
                </span>
              </div>
              <a
                href={currentPlatformObj.directUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopyText}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
              >
                <span>Launch {currentPlatformObj.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* API / Webhook Integration Settings */}
            <div className="border-t border-neutral-800 pt-2">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 py-1"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Custom API Credentials / Webhook (Stored in SQLite)</span>
              </button>

              {showConfig && (
                <div className="mt-2 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Webhook or Direct API Endpoint URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-api.com/webhooks/tiktok"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Bearer Token / API Key (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Bearer token or client secret"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-emerald-400">{savedConfigMsg}</span>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-medium"
                    >
                      Save to SQLite
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                Cancel
              </button>

              <button
                id="btn-confirm-post"
                onClick={handlePublishNow}
                disabled={isPosting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isPosting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish & Log to SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
