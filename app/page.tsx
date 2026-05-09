"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsCard {
  title: string;
  category: string;
  hookLine: string;
  headline: string;
  bullets: string[];
}

interface PackResult {
  caption: string;
  hashtags: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TONES      = ["Viral", "Professional", "Dramatic", "Gen Z", "Breaking News"] as const;
const CATEGORIES = ["All", "Technology", "Business", "Sports", "Entertainment", "Finance", "Politics"] as const;
const REGIONS    = ["India", "Worldwide"] as const;

const CAT_META: Record<string, { emoji: string; accent: string; bg: string; label: string }> = {
  Technology:    { emoji: "💡", accent: "#00d4ff", bg: "from-[#020d1a] to-[#0a2540]",   label: "TECH"        },
  Finance:       { emoji: "📈", accent: "#fbbf24", bg: "from-[#0d0800] to-[#2a1800]",   label: "FINANCE"     },
  Sports:        { emoji: "🏆", accent: "#4ade80", bg: "from-[#001209] to-[#003d1f]",   label: "SPORTS"      },
  Entertainment: { emoji: "🎬", accent: "#f472b6", bg: "from-[#0f0518] to-[#2d0d4a]",  label: "ENTERTAIN"   },
  Business:      { emoji: "💼", accent: "#60a5fa", bg: "from-[#020818] to-[#08163a]",   label: "BUSINESS"    },
  Politics:      { emoji: "🏛",  accent: "#fb923c", bg: "from-[#0f0300] to-[#3d1000]",  label: "POLITICS"    },
  All:           { emoji: "🌍", accent: "#E24B4A", bg: "from-[#080808] to-[#1a1228]",   label: "TRENDING"    },
};

const TOPIC_POOL: Record<string, { title: string; category: string }[]> = {
  India: [
    { title: "Indian AI Startups Surge Past $10B Investment Mark",    category: "Technology"    },
    { title: "Sensex Hits All-Time High Amid Global Market Rally",    category: "Finance"       },
    { title: "ISRO's New Mission Captures Global Attention",          category: "Technology"    },
    { title: "IPL 2026 Finals Breaks All Viewership Records",         category: "Sports"        },
    { title: "India-Pakistan Diplomatic Talks Resume After Decade",   category: "Politics"      },
    { title: "Bollywood Blockbuster Smashes Box Office Opening Week", category: "Entertainment" },
    { title: "RBI Announces Bold New Digital Currency Rollout",       category: "Finance"       },
    { title: "India Becomes World's Largest EV Market by Volume",     category: "Business"      },
    { title: "New Education Policy Transforms 500 Million Students",  category: "Politics"      },
    { title: "Jio-Airtel Merger Talks Shake Telecom Sector",          category: "Business"      },
    { title: "Indian Cricketer Sets New World Record in Test Match",  category: "Sports"        },
    { title: "India's Semiconductor Plant Goes Live, First Chip Out", category: "Technology"    },
    { title: "Bollywood Star Announces Surprise Retirement",          category: "Entertainment" },
    { title: "Parliament Passes Landmark Climate Change Bill",        category: "Politics"      },
    { title: "Delhi Thunderstorm Breaks Heatwave, City Celebrates",  category: "All"           },
  ],
  Worldwide: [
    { title: "OpenAI Releases GPT-6 With Multimodal Reasoning Leap", category: "Technology"    },
    { title: "Global Markets Surge as Fed Signals Rate Cuts",         category: "Finance"       },
    { title: "Tesla Unveils Fully Autonomous Robotaxi Fleet",         category: "Business"      },
    { title: "FIFA World Cup 2026 Kicks Off to Record Crowds",        category: "Sports"        },
    { title: "UN Climate Summit Reaches Historic Carbon Deal",        category: "Politics"      },
    { title: "Apple WWDC 2026 Drops Mind-Blowing AI Features",        category: "Technology"    },
    { title: "Hollywood Writers Strike Over AI Usage Rights",         category: "Entertainment" },
    { title: "Bitcoin Crosses $200K Milestone for First Time",        category: "Finance"       },
    { title: "SpaceX Crew Dragon Returns From Mars Test Mission",     category: "Technology"    },
    { title: "Netflix Lands Biggest Series Deal in Streaming History",category: "Entertainment" },
    { title: "Global Lithium Shortage Threatens EV Boom",             category: "Business"      },
    { title: "WHO Declares New Health Emergency Protocol",            category: "Politics"      },
    { title: "Amazon Acquires Major European Retailer for $40B",      category: "Business"      },
    { title: "LeBron James Breaks NBA All-Time Scoring Record Again", category: "Sports"        },
    { title: "EU Passes Sweeping Big Tech Regulation Act",            category: "Politics"      },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function callClaude(prompt: string, maxTokens = 2000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Dot({ color = "currentColor", delay = 0 }: { color?: string; delay?: number }) {
  return (
    <span
      style={{
        display: "inline-block", width: 6, height: 6, borderRadius: "50%",
        background: color, opacity: 0.4,
        animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 0.2, 0.4].map((d, i) => <Dot key={i} delay={d} />)}
    </span>
  );
}

function PulseDot({ color = "#E24B4A" }: { color?: string }) {
  return (
    <span
      style={{
        display: "inline-block", width: 7, height: 7, borderRadius: "50%",
        background: color, animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

// ─── Cinematic Poster Canvas ──────────────────────────────────────────────────
function CinematicPosterCanvas({ card, today }: { card: NewsCard; today: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meta = CAT_META[card.category] ?? CAT_META["All"];

  // Hex → RGB helper
  function hexRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(" "); const lines: string[] = []; let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1080, H = 1350;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const [ar, ag, ab] = hexRgb(meta.accent);
    const seed = card.title.length * 7 + card.category.length * 13;

    // ── BG gradient ──
    const BG_COLORS: Record<string, [string, string, string]> = {
      Technology:    ["#020d1a", "#0a2540", "#0f3d6e"],
      Finance:       ["#0d0800", "#2a1800", "#4a2e00"],
      Sports:        ["#001209", "#003d1f", "#005c2e"],
      Entertainment: ["#0f0518", "#2d0d4a", "#4a1272"],
      Business:      ["#020818", "#08163a", "#0e2560"],
      Politics:      ["#0f0300", "#3d1000", "#6b1e00"],
      All:           ["#080808", "#1a1228", "#2a1a3a"],
    };
    const [c1, c2, c3] = BG_COLORS[card.category] ?? BG_COLORS["All"];
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.5, H);
    bgGrad.addColorStop(0, c1); bgGrad.addColorStop(0.5, c2); bgGrad.addColorStop(1, c3);
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

    // ── Category scene ──
    ctx.save();
    if (card.category === "Technology") {
      const bhs = [420,380,500,350,460,390,430,370,490,410];
      bhs.forEach((bh, i) => {
        const bx = i * (W / 9) - 20, by = H - bh;
        const bg2 = ctx.createLinearGradient(bx, by, bx, H);
        bg2.addColorStop(0, `rgba(${ar},${ag},${ab},0.07)`); bg2.addColorStop(1, `rgba(15,61,110,0.5)`);
        ctx.fillStyle = bg2; ctx.fillRect(bx, by, W / 9 - 4, bh);
        for (let wy = by + 20; wy < H - 60; wy += 28)
          for (let wx = bx + 8; wx < bx + W / 9 - 12; wx += 18) {
            ctx.fillStyle = Math.random() > 0.55 ? `rgba(${ar},${ag},${ab},0.45)` : `rgba(255,255,255,0.06)`;
            ctx.fillRect(wx, wy, 10, 16);
          }
      });
      [200,420,620,820].forEach(y => {
        const lg = ctx.createLinearGradient(0, y, W, y);
        lg.addColorStop(0, "transparent"); lg.addColorStop(0.5, `rgba(${ar},${ag},${ab},0.13)`); lg.addColorStop(1, "transparent");
        ctx.fillStyle = lg; ctx.fillRect(0, y, W, 2);
      });
    } else if (card.category === "Finance") {
      const pts: [number,number][] = [[50,900],[150,820],[260,740],[370,670],[470,710],[570,590],[670,510],[770,470],[870,395],[970,340],[1060,270]];
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([x,y]) => ctx.lineTo(x, y));
      ctx.lineTo(1060,H); ctx.lineTo(50,H); ctx.closePath();
      const cf = ctx.createLinearGradient(0,270,0,H);
      cf.addColorStop(0,`rgba(${ar},${ag},${ab},0.22)`); cf.addColorStop(1,`rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = cf; ctx.fill();
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([x,y]) => ctx.lineTo(x,y));
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.7)`; ctx.lineWidth = 3; ctx.stroke();
      [[0,350,160,650],[180,250,130,750],[870,280,140,720],[W-40,350,110,650]].forEach(([bx,by,bw,bh]) => {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx,by,bw,bh);
      });
    } else if (card.category === "Sports") {
      const sg = ctx.createRadialGradient(W/2,H,50,W/2,H,700);
      sg.addColorStop(0,`rgba(${ar},${ag},${ab},0.14)`); sg.addColorStop(1,"transparent");
      ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
      [[W/2,H-100,540,195],[W/2,H-125,410,145]].forEach(([cx,cy,rx,ry]) => {
        ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${ar},${ag},${ab},0.2)`; ctx.lineWidth=2; ctx.stroke();
      });
      [[60,0,250,H],[W-60,0,W-250,H]].forEach(([x1,_y1,x2,y2]) => {
        const fl=ctx.createLinearGradient(x1,0,x2,y2);
        fl.addColorStop(0,`rgba(${ar},${ag},${ab},0.14)`); fl.addColorStop(1,"transparent");
        ctx.beginPath(); ctx.moveTo(x1,0); ctx.lineTo(x1-110,H); ctx.lineTo(x2+110,H); ctx.closePath();
        ctx.fillStyle=fl; ctx.fill();
      });
      for(let row=0;row<8;row++) for(let col=0;col<28;col++) {
        const cx=col*(W/27), cy=180+row*42;
        const colors=[`rgba(${ar},${ag},${ab},0.5)`,"rgba(255,255,255,0.22)","rgba(255,100,100,0.4)","rgba(100,180,255,0.3)"];
        ctx.fillStyle=colors[(row*col+seed)%4];
        ctx.beginPath(); ctx.ellipse(cx,cy,11,17,0,0,Math.PI*2); ctx.fill();
      }
      for(let i=0;i<80;i++){
        const cx=(i*137+seed)%W, cy=(i*97+seed)%580;
        ctx.fillStyle=[`rgba(${ar},${ag},${ab},0.7)`,"rgba(255,255,255,0.6)","rgba(255,220,0,0.65)"][i%3];
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(i*0.4); ctx.fillRect(-3,-7,6,14); ctx.restore();
      }
    } else if (card.category === "Entertainment") {
      const rg=ctx.createLinearGradient(W/2,H,W/2,380);
      rg.addColorStop(0,"rgba(140,0,0,0.55)"); rg.addColorStop(1,"rgba(60,0,0,0)");
      ctx.beginPath(); ctx.moveTo(340,H); ctx.lineTo(740,H); ctx.lineTo(890,380); ctx.lineTo(190,380); ctx.closePath();
      ctx.fillStyle=rg; ctx.fill();
      for(let i=0;i<28;i++){
        const bx=(i*173+seed)%W, by=(i*131+seed)%H, br=8+i%20;
        ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2);
        ctx.fillStyle=`rgba(${ar},${ag},${ab},${0.04+i%8*0.01})`; ctx.fill();
      }
      for(let i=0;i<14;i++){
        const fx=(i*211+seed)%W, fy=80+i%8*60;
        const fg=ctx.createRadialGradient(fx,fy,0,fx,fy,40+i%20);
        fg.addColorStop(0,"rgba(255,255,255,0.5)"); fg.addColorStop(1,"transparent");
        ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(fx,fy,40+i%20,0,Math.PI*2); ctx.fill();
      }
    } else if (card.category === "Business") {
      const towers:number[][] = [[60,150,155,H-150],[240,100,135,H-100],[420,200,120,H-200],[600,80,148,H-80],[800,165,138,H-165],[990,120,100,H-120]];
      towers.forEach(([bx,by,bw,bh],i) => {
        const tg=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
        tg.addColorStop(0,`rgba(14,37,96,0.55)`); tg.addColorStop(0.5,`rgba(${ar},${ag},${ab},0.07)`); tg.addColorStop(1,`rgba(8,22,58,0.4)`);
        ctx.fillStyle=tg; ctx.fillRect(bx,by,bw,bh);
        for(let wy=by+20;wy<by+bh-20;wy+=35) for(let wx=bx+10;wx<bx+bw-10;wx+=22){
          ctx.fillStyle=`rgba(${ar},${ag},${ab},${Math.random()>0.6?0.14:0.03})`; ctx.fillRect(wx,wy,13,22);
        }
      });
    } else if (card.category === "Politics") {
      [80,220,360,500,640,780,920].forEach(cx=>{
        const cg=ctx.createLinearGradient(cx,0,cx+50,0);
        cg.addColorStop(0,"rgba(107,30,0,0.5)"); cg.addColorStop(0.5,"rgba(255,255,255,0.04)"); cg.addColorStop(1,"rgba(61,16,0,0.4)");
        ctx.fillStyle=cg; ctx.fillRect(cx,140,50,H-140);
        ctx.fillStyle="rgba(107,30,0,0.7)"; ctx.fillRect(cx-10,130,70,30);
      });
      for(let i=0;i<38;i++){
        const px=i*(W/37), py=H-55-Math.sin(i*0.8)*38;
        ctx.beginPath(); ctx.ellipse(px,py,13,35,0,0,Math.PI*2);
        ctx.fillStyle=`rgba(61,16,0,${0.4+i%5*0.08})`; ctx.fill();
      }
      for(let i=0;i<12;i++){
        const tx=80+i*82,ty=500+i%4*40;
        const tlg=ctx.createRadialGradient(tx,ty,0,tx,ty,60+i%20);
        tlg.addColorStop(0,`rgba(${ar},${ag},${ab},0.48)`); tlg.addColorStop(1,"transparent");
        ctx.fillStyle=tlg; ctx.beginPath(); ctx.arc(tx,ty,60+i%20,0,Math.PI*2); ctx.fill();
      }
    } else {
      for(let i=0;i<20;i++){
        const bx=i*(W/19), by=200+Math.sin(i*0.7)*140, bw=W/19-3, bh=H-by;
        const bg3=ctx.createLinearGradient(bx,by,bx,H);
        bg3.addColorStop(0,`rgba(${ar},${ag},${ab},0.09)`); bg3.addColorStop(1,"rgba(42,26,58,0.55)");
        ctx.fillStyle=bg3; ctx.fillRect(bx,by,bw,bh);
      }
      const hz=ctx.createLinearGradient(0,H*0.46,0,H*0.64);
      hz.addColorStop(0,"transparent"); hz.addColorStop(0.5,`rgba(${ar},${ag},${ab},0.18)`); hz.addColorStop(1,"transparent");
      ctx.fillStyle=hz; ctx.fillRect(0,H*0.46,W,H*0.18);
    }
    ctx.restore();

    // ── Vignette ──
    const vig=ctx.createRadialGradient(W/2,H/2,W*0.2,W/2,H/2,W*0.85);
    vig.addColorStop(0,"transparent"); vig.addColorStop(1,"rgba(0,0,0,0.65)");
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

    // ── Hero glow ──
    const hg=ctx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,W*0.48);
    hg.addColorStop(0,`rgba(${ar},${ag},${ab},0.13)`); hg.addColorStop(1,"transparent");
    ctx.fillStyle=hg; ctx.fillRect(0,0,W,H);

    // ── Bottom scrim ──
    const sc=ctx.createLinearGradient(0,H*0.35,0,H);
    sc.addColorStop(0,"rgba(0,0,0,0)"); sc.addColorStop(0.2,"rgba(0,0,0,0.58)"); sc.addColorStop(1,"rgba(0,0,0,0.96)");
    ctx.fillStyle=sc; ctx.fillRect(0,0,W,H);

    // ── Top scrim ──
    const ts=ctx.createLinearGradient(0,0,0,160);
    ts.addColorStop(0,"rgba(0,0,0,0.72)"); ts.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=ts; ctx.fillRect(0,0,W,160);

    // ── Category badge ──
    rrect(ctx,38,36,230,52,26); ctx.fillStyle=meta.accent; ctx.fill();
    ctx.font="bold 20px Arial Black,Arial"; ctx.fillStyle="#000"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText("⚡ "+meta.label,60,62);

    // ── Date badge ──
    rrect(ctx,W-230,36,190,52,26);
    ctx.fillStyle="rgba(0,0,0,0.58)"; ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=1; ctx.stroke();
    ctx.font="500 14px Arial"; ctx.fillStyle="rgba(255,255,255,0.78)"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("📅 "+today,W-135,62);

    // ── Emoji glow + hero emoji ──
    const eg=ctx.createRadialGradient(W/2,300,10,W/2,300,155);
    eg.addColorStop(0,`rgba(${ar},${ag},${ab},0.28)`); eg.addColorStop(1,"transparent");
    ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(W/2,300,155,0,Math.PI*2); ctx.fill();
    ctx.font="105px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor=meta.accent; ctx.shadowBlur=40;
    ctx.fillText(meta.emoji,W/2,315); ctx.shadowBlur=0;

    // ── Hook line ──
    const hookY=430;
    ctx.font="bold italic 32px Georgia,serif"; ctx.fillStyle=meta.accent; ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=14;
    const hkLines=wrap(ctx,card.hookLine||"Breaking right now",W-100);
    hkLines.slice(0,2).forEach((line,i)=>ctx.fillText(line,50,hookY+i*44));
    ctx.shadowBlur=0;

    // ── Headline ──
    let hlY=hookY+Math.min(hkLines.length,2)*44+22;
    ctx.font="bold 68px Arial Black,Arial"; ctx.textBaseline="top";
    ctx.shadowColor="rgba(0,0,0,1)"; ctx.shadowBlur=22;
    const hlLines=wrap(ctx,card.headline||card.title,W-100);
    hlLines.forEach((line,i)=>{
      ctx.fillStyle=i%2===1?meta.accent:"#ffffff";
      ctx.fillText(line,50,hlY); hlY+=78;
    });
    ctx.shadowBlur=0;

    // ── Divider ──
    const divY=hlY+10;
    ctx.fillStyle=meta.accent; ctx.fillRect(50,divY,90,6);
    ctx.fillStyle="rgba(255,255,255,0.18)"; ctx.fillRect(150,divY+2,W-200,2);

    // ── Bullets ──
    const bStartY=divY+44;
    card.bullets.slice(0,4).forEach((bullet,i)=>{
      const by=bStartY+i*72;
      rrect(ctx,44,by-2,W-88,58,12); ctx.fillStyle="rgba(255,255,255,0.07)"; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.1)"; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=meta.accent; ctx.fillRect(44,by-2,5,58);
      ctx.font="bold 15px Arial"; ctx.fillStyle=meta.accent; ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillText("▸",62,by+27);
      ctx.font="500 22px Arial"; ctx.fillStyle="rgba(255,255,255,0.93)";
      ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=8;
      ctx.fillText(bullet.length>63?bullet.slice(0,60)+"…":bullet,90,by+27);
      ctx.shadowBlur=0;
    });

    // ── Brand bar ──
    const bbY=H-76;
    const bbG=ctx.createLinearGradient(0,bbY,W,bbY);
    bbG.addColorStop(0,meta.accent); bbG.addColorStop(1,c2);
    ctx.fillStyle=bbG; ctx.fillRect(0,bbY,W,76);
    ctx.font="bold 26px Arial Black,Arial"; ctx.fillStyle="#fff"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=8;
    ctx.fillText("🔥 LOST IN TRENDS",44,bbY+38);
    ctx.font="14px Arial"; ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.textAlign="right";
    ctx.fillText("Turn News Into Viral Content",W-44,bbY+38);
    ctx.shadowBlur=0;

  }, [card, today]);

  const download = () => {
    const canvas = canvasRef.current; if(!canvas) return;
    const a = document.createElement("a");
    a.download = `lost-in-trends-${(card.headline||card.title).slice(0,28).replace(/\s+/g,"-")}.png`;
    a.href = canvas.toDataURL("image/png"); a.click();
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#080808]">
      <div className="relative" style={{ aspectRatio: "4/5" }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="bg-[#0d0d0d] px-4 py-3 flex justify-between items-center gap-3 border-t border-white/5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-widest mb-0.5 truncate" style={{ color: meta.accent }}>{meta.label}</p>
          <p className="text-[10px] text-white/30 truncate">{(card.headline || card.title).slice(0, 40)}…</p>
        </div>
        <button
          onClick={download}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-black cursor-pointer border-none text-white hover:opacity-80 transition-opacity"
          style={{ background: `linear-gradient(135deg,${meta.accent},#1a1a1a)` }}
        >
          ↓ Save PNG
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LostInTrendsPage() {
  const [region,   setRegion]   = useState<"India"|"Worldwide">("India");
  const [count,    setCount]    = useState(5);
  const [category, setCategory] = useState("All");
  const [tone,     setTone]     = useState("Viral");
  const [cards,    setCards]    = useState<NewsCard[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loadHL,   setLoadHL]   = useState(false);
  const [loadPk,   setLoadPk]   = useState(false);
  const [packDone, setPackDone] = useState(false);
  const [caption,  setCaption]  = useState("");
  const [hashtags, setHashtags] = useState("");
  const [copied,   setCopied]   = useState("");
  const [error,    setError]    = useState("");
  const posterRef = useRef<HTMLDivElement>(null);
  const today = formatDate();

  // ── Generate Headlines ──────────────────────────────────────────────────────
  const genHeadlines = useCallback(async () => {
    setLoadHL(true); setCards([]); setSelected([]); setPackDone(false); setError("");
    try {
      const pool = TOPIC_POOL[region] ?? [];
      const filtered = category === "All" ? pool : pool.filter(t => t.category === category);
      const topics = [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.min(count, filtered.length));
      const seed = Math.random().toString(36).slice(2, 8);

      const raw = await callClaude(
        `You are a viral social media content creator. Today: ${today}. Region: ${region}. Tone: ${tone}. Seed: ${seed}.

Topics:
${topics.map((t, i) => `${i + 1}. [${t.category}] ${t.title}`).join("\n")}

For EACH topic generate:
- hookLine: punchy hook <10 words, emojis, ${tone} tone
- headline: viral rewrite of title, bold and punchy
- bullets: exactly 4 short punchy facts, each <12 words

Vary structure every card. Never repeat phrases. Be emotionally resonant.
Respond ONLY with valid JSON array, no markdown:
[{"hookLine":"...","headline":"...","bullets":["...","...","...","..."]}]`
      );

      let parsed: { hookLine: string; headline: string; bullets: string[] }[] = [];
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { const m = raw.match(/\[[\s\S]*\]/); if (m) parsed = JSON.parse(m[0]); }

      setCards(topics.map((t, i) => ({
        ...t,
        hookLine: parsed[i]?.hookLine ?? "Breaking right now 🚨",
        headline: parsed[i]?.headline ?? t.title,
        bullets:  parsed[i]?.bullets  ?? ["Story unfolding.", "Experts reacting.", "Global impact expected.", "Updates incoming."],
      })));
    } catch (e: any) {
      setError("Headline generation failed: " + (e?.message ?? "unknown error"));
    }
    setLoadHL(false);
  }, [region, category, count, tone, today]);

  // ── Generate Viral Pack ────────────────────────────────────────────────────
  const genViralPack = useCallback(async () => {
    if (!selected.length) return;
    setLoadPk(true); setPackDone(false); setError("");
    try {
      const topicList = selected.map(i => cards[i].headline || cards[i].title).join("; ");
      const seed = Math.random().toString(36).slice(2, 8);
      const raw = await callClaude(
        `Viral Instagram strategist. ONE combined caption and hashtag set.
Topics: ${topicList}
Region: ${region}, Tone: ${tone}, Seed: ${seed}.
- caption: 3-4 sentences, ${tone} tone, ends with question, 2-3 emojis
- hashtags: 12 relevant hashtags space-separated
Fresh and unique. JSON only, no markdown:
{"caption":"...","hashtags":"#tag1 #tag2 ..."}`
      , 500);
      let p: PackResult = { caption: "", hashtags: "" };
      try { p = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { const m = raw.match(/\{[\s\S]*\}/); if (m) p = JSON.parse(m[0]); }
      setCaption(p.caption || "The internet is on fire right now 🌍🔥\n\nFrom tech breakthroughs to cultural moments — something massive is happening.\n\nWhich headline hit different? 👀");
      setHashtags(p.hashtags || "#Trending #BreakingNews #IndiaNews #WorldNews #Viral #Technology #Business #Sports");
      setPackDone(true);
      setTimeout(() => posterRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e: any) {
      setError("Pack generation failed: " + (e?.message ?? "unknown error"));
    }
    setLoadPk(false);
  }, [selected, cards, region, tone]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key);
    setTimeout(() => setCopied(""), 2200);
  };

  const toggleSelect = (i: number) =>
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#f0ede8]" style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,900&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes shimmer{ 0%,100%{opacity:.4} 50%{opacity:.7} }
        .slide-up { animation: slideUp .5s ease both; }
        .slide-up-d1 { animation: slideUp .5s ease .1s both; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] px-6"
        style={{ background: "rgba(8,8,8,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between h-[62px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg,#E24B4A,#7f1d1d)" }}>🔥</div>
            <div>
              <div className="font-black text-[18px] leading-none tracking-tight"
                style={{ fontFamily: "'Playfair Display',serif" }}>LOST IN TRENDS</div>
              <div className="text-[8px] font-bold tracking-[2px] uppercase" style={{ color: "#E24B4A" }}>
                Cinematic Viral Content Generator
              </div>
            </div>
          </div>
          {/* Date */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/40 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06]">
              📅 {today}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <section className="text-center mb-12 slide-up">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 border"
            style={{ background: "rgba(226,75,74,0.1)", borderColor: "rgba(226,75,74,0.3)" }}>
            <PulseDot />
            <span className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: "#E24B4A" }}>
              Live Trends · {today}
            </span>
          </div>

          <h1 className="font-black leading-[1.1] mb-3 tracking-tight"
            style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,5.5vw,58px)" }}>
            Turn Trending News Into<br />
            <span style={{ color: "#E24B4A" }}>Cinematic Instagram Posters</span> Instantly.
          </h1>

          <p className="text-white/50 max-w-[460px] mx-auto text-[15px]">
            AI writes the content. Canvas renders cinematic posters. You download and go viral.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {["🎬 Cinematic Backgrounds","✍️ AI Headlines","📱 1080×1350 Portrait","⚡ No Setup"].map(f => (
              <span key={f} className="text-[11px] text-white/40 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06]">
                {f}
              </span>
            ))}
          </div>
        </section>

        {/* ── CONTROLS ───────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-white/[0.07] p-6 sm:p-7 mb-8 slide-up-d1"
          style={{ background: "#111" }}>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Region */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[1.5px] mb-2.5">Region</label>
              <div className="flex gap-2">
                {REGIONS.map(r => (
                  <button key={r} onClick={() => setRegion(r)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none transition-all"
                    style={{
                      background: region === r ? "#E24B4A" : "rgba(255,255,255,0.05)",
                      color: region === r ? "#fff" : "rgba(255,255,255,0.7)",
                    }}>
                    {r === "India" ? "🇮🇳 India" : "🌍 World"}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[1.5px] mb-2.5">Headlines</label>
              <div className="flex gap-1.5">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className="flex-1 py-2.5 rounded-xl text-[15px] font-black cursor-pointer border-none transition-all"
                    style={{
                      background: count === n ? "#E24B4A" : "rgba(255,255,255,0.05)",
                      color: count === n ? "#fff" : "rgba(255,255,255,0.7)",
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[1.5px] mb-2.5">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl text-[13px] border border-white/[0.08] outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)", fontFamily: "inherit" }}>
                {CATEGORIES.map(c => <option key={c} style={{ background: "#1a1a1a" }}>{c}</option>)}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[1.5px] mb-2.5">Tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl text-[13px] border border-white/[0.08] outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)", fontFamily: "inherit" }}>
                {TONES.map(t => <option key={t} style={{ background: "#1a1a1a" }}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 flex-wrap">
            <button
              onClick={genHeadlines} disabled={loadHL}
              className="flex-1 min-w-[180px] py-[14px] px-6 rounded-xl font-black text-[15px] text-white border-none flex items-center justify-center gap-2 transition-all"
              style={{ background: loadHL ? "#333" : "linear-gradient(135deg,#E24B4A,#991b1b)", cursor: loadHL ? "not-allowed" : "pointer" }}>
              {loadHL ? <><LoadingDots /> Fetching Trends…</> : <>✨ Generate Headlines</>}
            </button>

            {cards.length > 0 && (
              <button
                onClick={genViralPack} disabled={loadPk || !selected.length}
                className="flex-1 min-w-[180px] py-[14px] px-6 rounded-xl font-black text-[15px] border-2 flex items-center justify-center gap-2 transition-all"
                style={{
                  borderColor: !selected.length ? "rgba(255,255,255,0.08)" : "#E24B4A",
                  color: !selected.length ? "rgba(255,255,255,0.3)" : "#E24B4A",
                  background: "none", cursor: !selected.length ? "not-allowed" : "pointer",
                }}>
                {loadPk ? <><LoadingDots /> Generating…</> : <>🎬 Generate Viral Pack {selected.length > 0 ? `(${selected.length})` : ""}</>}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-3 px-4 py-3 rounded-xl text-[13px]"
              style={{ background: "rgba(226,75,74,0.1)", border: "0.5px solid rgba(226,75,74,0.3)", color: "#E24B4A" }}>
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* ── SHIMMER ─────────────────────────────────────────────────────────── */}
        {loadHL && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl"
                style={{ background: "#1a1a1a", animation: `shimmer 1.5s ease ${i * 0.1}s infinite` }} />
            ))}
          </div>
        )}

        {/* ── HEADLINE CARDS ───────────────────────────────────────────────────── */}
        {cards.length > 0 && !loadHL && (
          <section className="mb-12">
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[18px] font-black mb-0.5">Today's Trending Headlines</h2>
                <p className="text-[12px] text-white/40">Click cards to select → Generate Viral Pack</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(cards.map((_, i) => i))}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold text-white/70 border border-white/[0.08] bg-transparent cursor-pointer hover:bg-white/[0.05] transition-colors">
                  Select All
                </button>
                <button
                  onClick={() => setSelected([])}
                  className="px-3.5 py-1.5 rounded-lg text-[12px] text-white/30 border border-white/[0.06] bg-transparent cursor-pointer hover:bg-white/[0.04] transition-colors">
                  Clear
                </button>
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card, i) => {
                const meta = CAT_META[card.category] ?? CAT_META["All"];
                const isSelected = selected.includes(i);
                const GRADS: Record<string,string> = {
                  Technology:"linear-gradient(135deg,#020d1a,#0a2540)",Finance:"linear-gradient(135deg,#0d0800,#2a1800)",
                  Sports:"linear-gradient(135deg,#001209,#003d1f)",Entertainment:"linear-gradient(135deg,#0f0518,#2d0d4a)",
                  Business:"linear-gradient(135deg,#020818,#08163a)",Politics:"linear-gradient(135deg,#0f0300,#3d1000)",
                  All:"linear-gradient(135deg,#080808,#1a1228)",
                };
                return (
                  <div key={i}
                    onClick={() => toggleSelect(i)}
                    className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                    style={{
                      background: isSelected ? "rgba(226,75,74,0.07)" : "#111",
                      border: isSelected ? "2px solid #E24B4A" : "0.5px solid rgba(255,255,255,0.08)",
                      transform: isSelected ? "scale(1.015)" : "scale(1)",
                      animation: `slideUp .4s ease ${i * 0.06}s both`,
                    }}>
                    {/* Header strip */}
                    <div className="flex justify-between items-start px-4 py-3.5"
                      style={{ background: GRADS[card.category] ?? GRADS["All"] }}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: meta.accent + "33", color: meta.accent, border: `1px solid ${meta.accent}44` }}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[13px] flex-shrink-0"
                        style={{ background: isSelected ? "#E24B4A" : "rgba(255,255,255,0.15)", border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.3)" }}>
                        {isSelected ? "✓" : "+"}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                      {card.hookLine && (
                        <p className="text-[11px] font-bold mb-1.5 tracking-wide" style={{ color: "#E24B4A" }}>
                          {card.hookLine}
                        </p>
                      )}
                      <h3 className="text-[13px] font-bold mb-2.5 leading-[1.45] text-white">
                        {card.headline || card.title}
                      </h3>
                      <div className="space-y-1.5">
                        {card.bullets.slice(0, 3).map((b, bi) => (
                          <div key={bi} className="flex gap-2">
                            <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: meta.accent }}>●</span>
                            <span className="text-[11px] text-white/50 leading-[1.5]">{b}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-semibold mt-2.5" style={{ color: isSelected ? "#E24B4A" : "rgba(255,255,255,0.3)" }}>
                        {isSelected ? "✓ Selected — poster will be generated" : "Click to select"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── POSTER OUTPUT ────────────────────────────────────────────────────── */}
        {packDone && (
          <section ref={posterRef} style={{ animation: "slideUp .5s ease both" }}>
            {/* Section divider */}
            <div className="flex items-center gap-4 mb-3">
              <div className="h-px flex-1 bg-white/[0.07]" />
              <span className="text-[11px] font-black tracking-[2px] uppercase" style={{ color: "#E24B4A" }}>
                🎬 Cinematic Posters · 1080×1350
              </span>
              <div className="h-px flex-1 bg-white/[0.07]" />
            </div>
            <p className="text-center text-[12px] text-white/35 mb-7">
              Each poster has a unique cinematic scene + AI content overlay — ready to download
            </p>

            {/* Poster grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {selected.map(si => (
                <CinematicPosterCanvas key={si} card={cards[si]} today={today} />
              ))}
            </div>

            {/* Caption + Hashtags */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Caption */}
              <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "#111" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[1.5px]">📝 Common Caption</span>
                  <button
                    onClick={() => copyText(caption, "caption")}
                    className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-all"
                    style={{
                      background: copied === "caption" ? "rgba(226,75,74,0.1)" : "none",
                      borderColor: copied === "caption" ? "rgba(226,75,74,0.4)" : "rgba(255,255,255,0.1)",
                      color: copied === "caption" ? "#E24B4A" : "rgba(255,255,255,0.4)",
                    }}>
                    {copied === "caption" ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-[14px] leading-[1.75] text-white/85 whitespace-pre-wrap">{caption}</p>
              </div>

              {/* Hashtags */}
              <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "#111" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[1.5px]"># Hashtags</span>
                  <button
                    onClick={() => copyText(hashtags, "hashtags")}
                    className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer border transition-all"
                    style={{
                      background: copied === "hashtags" ? "rgba(226,75,74,0.1)" : "none",
                      borderColor: copied === "hashtags" ? "rgba(226,75,74,0.4)" : "rgba(255,255,255,0.1)",
                      color: copied === "hashtags" ? "#E24B4A" : "rgba(255,255,255,0.4)",
                    }}>
                    {copied === "hashtags" ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hashtags.split(" ").filter(Boolean).map((tag, i) => (
                    <span key={i} className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(226,75,74,0.1)", color: "#E24B4A" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── EMPTY STATE ──────────────────────────────────────────────────────── */}
        {cards.length === 0 && !loadHL && (
          <div className="text-center py-16">
            <div className="text-6xl mb-5">🎬</div>
            <p className="text-[17px] font-bold text-white mb-2">Ready to create cinematic content</p>
            <p className="text-[13px] text-white/40">Choose region → Generate Headlines → Select topics → Generate Viral Pack</p>
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-5 text-center">
        <p className="text-[11px] text-white/25">
          <span className="font-black" style={{ fontFamily: "'Playfair Display',serif" }}>LOST IN TRENDS</span>
          {" · "}Cinematic Visual Engine · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}