// ---------------------------------------------------------------------------
// Automated social publishing — official API endpoints for each platform.
// Configure in .env; each publisher fails gracefully (logged, never crashes
// the worker) when its credentials are missing.
//
// YouTube:    OAuth access token (refresh via GOOGLE_REFRESH_TOKEN) + resumable upload
// Facebook:   Meta Graph API — Page access token, server pull from URL
// TikTok:     Content Posting API (requires TikTok approval/scopes)
// Instagram: Meta Graph API / Instagram Content Publishing (Business/Creator account)
// Snapchat:   Restricted API — set SNAPCHAT_ENDPOINT after Snap partnership approval
// ---------------------------------------------------------------------------

import { getSocialAccount } from "./social-tokens";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { PLATFORM_PUBLISH_MAX_SECONDS } from "./autopilot-duration";

// Token lookup: DB-linked account (via OAuth or manual admin entry) first,
// falls back to a static .env token so existing deployments keep working.
async function tokenFor(platform: "tiktok" | "facebook" | "snapchat" | "youtube" | "instagram" | "twitch" | "x" | "linkedin", envVar: string, userId?: string, fallbackGlobal = true): Promise<string | undefined> {
  const account = await getSocialAccount(platform, userId, fallbackGlobal);
  return account?.access_token || (fallbackGlobal ? process.env[envVar] : undefined);
}


export async function getPublishDurationLimitSeconds(
  platform: string,
  userId?: string,
  fallbackGlobal = true
): Promise<number> {
  const configured = PLATFORM_PUBLISH_MAX_SECONDS[platform] ?? 21600;
  if (platform !== "tiktok") return configured;
  try {
    const token = await tokenFor("tiktok", "TIKTOK_ACCESS_TOKEN", userId, fallbackGlobal);
    if (!token) return configured;
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json; charset=UTF-8" }
    });
    const data: any = await res.json();
    const accountMax = Number(data?.data?.max_video_post_duration_sec || 0);
    return accountMax > 0 ? Math.min(configured, accountMax) : configured;
  } catch {
    return configured;
  }
}

export type PublishResult = {
  platform: "youtube" | "facebook" | "tiktok" | "snapchat" | "instagram" | "twitch" | "x" | "linkedin";
  ok: boolean;
  url?: string;
  error?: string;
};

async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("video download failed: HTTP " + res.status);
  return Buffer.from(await res.arrayBuffer());
}

// ---------- YouTube (Data API v3, resumable upload) ----------
async function googleAccessToken(userId?: string, fallbackGlobal = true): Promise<string> {
  const account = await getSocialAccount("youtube", userId, fallbackGlobal);
  const refreshToken = account?.refresh_token || (fallbackGlobal ? process.env.GOOGLE_REFRESH_TOKEN : undefined);
  if (!refreshToken) throw new Error("YouTube not linked (connect the account first)");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const data: any = await res.json();
  if (!data.access_token) throw new Error("YouTube auth failed: " + JSON.stringify(data));
  return data.access_token;
}

async function publishYouTube(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const account = await getSocialAccount("youtube", userId, fallbackGlobal);
    if (!account?.connected && !process.env.GOOGLE_REFRESH_TOKEN) throw new Error("YouTube not linked (connect it in Admin > Comptes connectés)");
    const token = await googleAccessToken(userId, fallbackGlobal);
    const meta = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: { title: caption.slice(0, 95), description: caption, categoryId: "22" },
          status: { privacyStatus: "public" }
        })
      }
    );
    const uploadUrl = meta.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube resumable session missing");
    const bytes = await fetchBytes(videoUrl);
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) },
      body: bytes
    });
    const data: any = await up.json();
    if (!up.ok) throw new Error("YouTube upload failed: " + JSON.stringify(data));
    return { platform: "youtube", ok: true, url: "https://youtu.be/" + data.id };
  } catch (e: any) {
    return { platform: "youtube", ok: false, error: e.message };
  }
}

// ---------- Facebook (Graph API — Page videos) ----------
async function publishFacebook(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const token = await tokenFor("facebook", "FACEBOOK_PAGE_ACCESS_TOKEN", userId, fallbackGlobal);
    if (!token) throw new Error("Facebook not linked (connect it in Admin > Comptes connectés)");
    const res = await fetch("https://graph.facebook.com/me/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, file_url: videoUrl, description: caption })
    });
    const data: any = await res.json();
    if (!res.ok || data.error) throw new Error("Facebook: " + JSON.stringify(data.error || data));
    return { platform: "facebook", ok: true, url: "https://facebook.com/" + data.id };
  } catch (e: any) {
    return { platform: "facebook", ok: false, error: e.message };
  }
}

// ---------- TikTok (Content Posting API) ----------
async function publishInstagram(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const token = await tokenFor("instagram", "INSTAGRAM_ACCESS_TOKEN", userId, fallbackGlobal);
    const account = await getSocialAccount("instagram", userId, fallbackGlobal);
    const igUserId = account?.page_id || process.env.INSTAGRAM_USER_ID;
    if (!token || !igUserId) throw new Error("Instagram not linked (connect an Instagram Business/Creator account through Meta)");
    const createRes = await fetch("https://graph.facebook.com/v19.0/" + igUserId + "/media", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ media_type: "REELS", video_url: videoUrl, caption, access_token: token })
    });
    const createData: any = await createRes.json();
    if (!createRes.ok || !createData.id) throw new Error("Instagram media create: " + JSON.stringify(createData));
    // Meta processes the media container asynchronously. Poll a few times before publishing.
    let ready = false;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 2500));
      const st = await fetch("https://graph.facebook.com/v19.0/" + createData.id + "?fields=status_code&access_token=" + encodeURIComponent(token));
      const sd: any = await st.json();
      if (sd.status_code === "FINISHED") { ready = true; break; }
      if (sd.status_code === "ERROR") throw new Error("Instagram media processing failed");
    }
    if (!ready) throw new Error("Instagram media processing timeout");
    const pub = await fetch("https://graph.facebook.com/v19.0/" + igUserId + "/media_publish", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: createData.id, access_token: token })
    });
    const pubData: any = await pub.json();
    if (!pub.ok || !pubData.id) throw new Error("Instagram publish: " + JSON.stringify(pubData));
    return { platform: "instagram", ok: true, url: "https://www.instagram.com/" + pubData.id };
  } catch (e: any) {
    return { platform: "instagram", ok: false, error: e.message };
  }
}

async function publishTikTok(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const token = await tokenFor("tiktok", "TIKTOK_ACCESS_TOKEN", userId, fallbackGlobal);
    if (!token) throw new Error("TikTok not linked (connect it in Admin > Comptes connectés; requires TikTok app approval)");
    const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        post_info: { title: caption.slice(0, 150), privacy_level: "PUBLIC_TO_EVERYONE" },
        source_info: { source: "PULL_FROM_URL", video_url: videoUrl }
      })
    });
    const data: any = await init.json();
    if (!init.ok || data.error?.code !== "ok") throw new Error("TikTok init: " + JSON.stringify(data.error || data));
    return { platform: "tiktok", ok: true, url: "publish_id:" + data.data?.publish_id };
  } catch (e: any) {
    return { platform: "tiktok", ok: false, error: e.message };
  }
}

// ---------- Twitch ----------
// Twitch receives the generated MP4 as a prerecorded live stream over RTMP.
// FFmpeg is executed locally on the Wesh Star IA server; no video provider is used.
async function publishTwitch(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const account = await getSocialAccount("twitch", userId, fallbackGlobal);
    const streamKey = account?.access_token || (fallbackGlobal ? process.env.TWITCH_STREAM_KEY : undefined);
    if (!streamKey) throw new Error("Twitch not linked (add a Twitch stream key/account in Admin > Comptes connectés)");
    const input = await fetchBytes(videoUrl);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn(process.env.FFMPEG_BIN || "ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-re", "-i", "pipe:0",
        "-map", "0:v:0", "-map", "0:a?",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
        "-f", "flv", "rtmps://live.twitch.tv/app/" + streamKey
      ]);
      let stderr = "";
      ff.stderr.on("data", (chunk) => { stderr += String(chunk); });
      ff.on("error", reject);
      ff.on("close", (code) => code === 0 ? resolve() : reject(new Error("Twitch FFmpeg failed (" + code + "): " + stderr.slice(-1000))));
      ff.stdin.on("error", reject);
      ff.stdin.end(input);
    });
    return { platform: "twitch", ok: true, url: "https://twitch.tv/" + (account?.account_name || "") };
  } catch (e: any) {
    return { platform: "twitch", ok: false, error: e.message };
  }
}

// ---------- Snapchat (restricted — via Snap partnership endpoint) ----------
async function publishSnapchat(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const endpoint = process.env.SNAPCHAT_UPLOAD_ENDPOINT;
    if (!endpoint) throw new Error("SNAPCHAT_UPLOAD_ENDPOINT not set (Snap partnership required)");
    const token = await tokenFor("snapchat", "SNAPCHAT_ACCESS_TOKEN", userId, fallbackGlobal);
    if (!token) throw new Error("Snapchat not linked (paste the token in Admin > Comptes connectés; requires Snap partnership)");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ video_url: videoUrl, caption })
    });
    if (!res.ok) throw new Error("Snapchat: HTTP " + res.status);
    const data: any = await res.json();
    return { platform: "snapchat", ok: true, url: data.url };
  } catch (e: any) {
    return { platform: "snapchat", ok: false, error: e.message };
  }
}



// ---------- X / Twitter ----------
// Uses X API v2 for the post and the classic media upload endpoint for video.
// OAuth 1.0a is used because video media upload requires user-context credentials.
function oauthEncode(v: string): string { return encodeURIComponent(v).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase()); }
function oauthHeader(method: string, url: string, params: Record<string,string>, consumerKey: string, consumerSecret: string, token: string, tokenSecret: string): string {
  const oauth: Record<string,string> = { oauth_consumer_key: consumerKey, oauth_nonce: crypto.randomUUID().replace(/-/g,''), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(Math.floor(Date.now()/1000)), oauth_token: token, oauth_version: "1.0" };
  const all = Object.entries({...params, ...oauth}).sort(([a, av],[b,bv]) => oauthEncode(a).localeCompare(oauthEncode(b)) || oauthEncode(av).localeCompare(oauthEncode(bv)));
  const normalized = all.map(([k,v]) => `${oauthEncode(k)}=${oauthEncode(v)}`).join("&");
  const base = `${method.toUpperCase()}&${oauthEncode(url)}&${oauthEncode(normalized)}`;
  const sig = createHmac("sha1", `${oauthEncode(consumerSecret)}&${oauthEncode(tokenSecret)}`).update(base).digest("base64");
  oauth.oauth_signature = sig;
  return "OAuth " + Object.entries(oauth).map(([k,v]) => `${oauthEncode(k)}="${oauthEncode(v)}"`).join(", ");
}
async function publishX(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const account = await getSocialAccount("x", userId, fallbackGlobal);
    const ck = process.env.X_CONSUMER_KEY || "", cs = process.env.X_CONSUMER_SECRET || "";
    const at = account?.access_token || (fallbackGlobal ? process.env.X_ACCESS_TOKEN : undefined) || "";
    const ats = account?.refresh_token || (fallbackGlobal ? process.env.X_ACCESS_TOKEN_SECRET : undefined) || "";
    if (!ck || !cs || !at || !ats) throw new Error("X/Twitter not linked (configure OAuth 1.0a credentials)");
    const bytes = await fetchBytes(videoUrl);
    const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
    const initParams = { command: "INIT", total_bytes: String(bytes.length), media_type: "video/mp4", media_category: "tweet_video" };
    let res = await fetch(uploadUrl, { method:"POST", headers:{Authorization:oauthHeader("POST",uploadUrl,initParams,ck,cs,at,ats),"Content-Type":"application/x-www-form-urlencoded"}, body:new URLSearchParams(initParams) });
    let data:any = await res.json(); if(!res.ok || !data.media_id_string) throw new Error("X media INIT: "+JSON.stringify(data));
    const mediaId = data.media_id_string;
    const chunkSize = 4 * 1024 * 1024;
    for(let i=0, seg=0; i<bytes.length; i+=chunkSize, seg++) {
      const chunk = bytes.subarray(i, Math.min(i+chunkSize, bytes.length));
      const mediaData = chunk.toString("base64");
      const params = { command:"APPEND", media_id:mediaId, segment_index:String(seg), media_data:mediaData };
      const form = new URLSearchParams(); form.set("command","APPEND"); form.set("media_id",mediaId); form.set("segment_index",String(seg)); form.set("media_data",mediaData);
      res = await fetch(uploadUrl,{method:"POST",headers:{Authorization:oauthHeader("POST",uploadUrl,params,ck,cs,at,ats),"Content-Type":"application/x-www-form-urlencoded"},body:form});
      if(!res.ok) throw new Error("X media APPEND: HTTP "+res.status);
    }
    const finParams = { command:"FINALIZE", media_id:mediaId };
    res = await fetch(uploadUrl,{method:"POST",headers:{Authorization:oauthHeader("POST",uploadUrl,finParams,ck,cs,at,ats),"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(finParams)});
    data = await res.json(); if(!res.ok) throw new Error("X media FINALIZE: "+JSON.stringify(data));
    if(data.processing_info) { for(let i=0;i<30 && data.processing_info?.state !== "succeeded";i++){ if(data.processing_info?.state === "failed") throw new Error("X video processing failed"); await new Promise(r=>setTimeout(r,Math.min(5000,(data.processing_info.check_after_secs||2)*1000))); const st=await fetch(uploadUrl+"?command=STATUS&media_id="+encodeURIComponent(mediaId),{headers:{Authorization:oauthHeader("GET",uploadUrl,{command:"STATUS",media_id:mediaId},ck,cs,at,ats)}}); data=await st.json(); } }
    const tweetUrl="https://api.x.com/2/tweets";
    const body={text:caption.slice(0,280),media:{media_ids:[mediaId]}};
    // X OAuth 1.0a user tokens can authorize the v2 tweet endpoint.
    res=await fetch(tweetUrl,{method:"POST",headers:{Authorization:oauthHeader("POST",tweetUrl,{},ck,cs,at,ats),"Content-Type":"application/json"},body:JSON.stringify(body)});
    data=await res.json(); if(!res.ok || !data.data?.id) throw new Error("X tweet: "+JSON.stringify(data));
    return {platform:"x",ok:true,url:"https://x.com/i/web/status/"+data.data.id};
  } catch(e:any){ return {platform:"x",ok:false,error:e.message}; }
}

// ---------- LinkedIn ----------
async function publishLinkedIn(videoUrl: string, caption: string, userId?: string, fallbackGlobal = true): Promise<PublishResult> {
  try {
    const account=await getSocialAccount("linkedin",userId,fallbackGlobal);
    const token=account?.access_token || (fallbackGlobal ? process.env.LINKEDIN_ACCESS_TOKEN : undefined);
    const owner=account?.page_id || (fallbackGlobal ? process.env.LINKEDIN_OWNER_URN : undefined);
    const version=process.env.LINKEDIN_VERSION || "202607";
    if(!token || !owner) throw new Error("LinkedIn not linked (configure access token and owner URN)");
    const bytes=await fetchBytes(videoUrl);
    const base="https://api.linkedin.com/rest/videos?action=initializeUpload";
    const headers={Authorization:"Bearer "+token,"Linkedin-Version":version,"X-Restli-Protocol-Version":"2.0.0","Content-Type":"application/json"};
    let res=await fetch(base,{method:"POST",headers,body:JSON.stringify({initializeUploadRequest:{owner,fileSizeBytes:bytes.length,uploadCaptions:false,uploadThumbnail:false}})});
    let data:any=await res.json(); if(!res.ok || !data.value?.video) throw new Error("LinkedIn initializeUpload: "+JSON.stringify(data));
    const instructions=data.value.uploadInstructions||[];
    const uploadedPartIds:string[]=[];
    for(const ins of instructions){ const chunk=bytes.subarray(ins.firstByte,ins.lastByte+1); const up=await fetch(ins.uploadUrl,{method:"PUT",headers:{"Content-Type":"application/octet-stream","Content-Length":String(chunk.length)},body:chunk}); if(!up.ok) throw new Error("LinkedIn video upload: HTTP "+up.status); const etag=up.headers.get("etag"); if(etag) uploadedPartIds.push(etag.replace(/^\"|\"$/g,"")); }
    const videoUrn=data.value.video;
    const fin="https://api.linkedin.com/rest/videos?action=finalizeUpload";
    res=await fetch(fin,{method:"POST",headers,body:JSON.stringify({finalizeUploadRequest:{video:videoUrn,uploadToken:data.value.uploadToken||"",uploadedPartIds}})}); data=await res.json().catch(()=>({})); if(!res.ok) throw new Error("LinkedIn finalize: "+JSON.stringify(data));
    const post="https://api.linkedin.com/rest/posts";
    const postBody={author:owner,commentary:caption.slice(0,3000),visibility:"PUBLIC",distribution:{feedDistribution:"MAIN_FEED",targetEntities:[],thirdPartyDistributionChannels:[]},content:{media:{title:caption.slice(0,200),id:videoUrn}},lifecycleState:"PUBLISHED",isReshareDisabledByAuthor:false};
    res=await fetch(post,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(postBody)}); data=await res.json().catch(()=>({})); if(!res.ok) throw new Error("LinkedIn post: "+JSON.stringify(data));
    return {platform:"linkedin",ok:true,url:"https://www.linkedin.com/feed/" + (res.headers.get("x-restli-id") ? "update/" + encodeURIComponent(res.headers.get("x-restli-id")!) : "")};
  }catch(e:any){return {platform:"linkedin",ok:false,error:e.message};}
}

export async function publishVideo(
  videoUrl: string,
  caption: string,
  platforms: string[],
  userId?: string,
  fallbackGlobal = true
): Promise<PublishResult[]> {
  const out: PublishResult[] = [];
  for (const p of platforms) {
    if (p === "youtube") out.push(await publishYouTube(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "facebook") out.push(await publishFacebook(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "tiktok") out.push(await publishTikTok(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "instagram") out.push(await publishInstagram(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "snapchat") out.push(await publishSnapchat(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "twitch") out.push(await publishTwitch(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "x") out.push(await publishX(videoUrl, caption, userId, fallbackGlobal));
    else if (p === "linkedin") out.push(await publishLinkedIn(videoUrl, caption, userId, fallbackGlobal));
  }
  return out;
}

export async function configuredPlatforms(settings: any, userId?: string, fallbackGlobal = true): Promise<string[]> {
  const p = settings?.site?.platforms || {};
  const status = await Promise.all(
    (["tiktok","facebook","youtube","snapchat","instagram","twitch","x","linkedin"] as const).map(async (platform) => [platform, await getSocialAccount(platform, userId, fallbackGlobal)] as const)
  );
  return status.filter(([platform, account]) => p[platform] !== false && !!account?.connected && !!account.access_token)
    .map(([platform]) => platform);
}
