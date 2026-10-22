import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";
import { listCommunityPosts } from "@/lib/community";
export async function GET(req:Request){const access=await getAccess();if(!access.user)return NextResponse.json({error:"AUTH_REQUIRED"},{status:401});const s=await getSettings();if(!s.site.communityEnabled && !s.site.socialNetworkEnabled)return NextResponse.json({error:"COMMUNITY_DISABLED"},{status:404});const tab=new URL(req.url).searchParams.get("tab")||"for-you";return NextResponse.json({posts:await listCommunityPosts(access.user.id,tab)});}
