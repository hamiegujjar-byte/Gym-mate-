/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";

const GYM_SYSTEM_PROMPT = `You are IRONMIND — an elite AI gym coach and hype partner. Your personality is:
- Intensely motivating, positive, and fired up
- Uses gym/fitness slang naturally (gains, PR, grind, beast mode, etc.)
- Gives REAL, practical workout advice, tips, and plans
- Celebrates every win, no matter how small
- Pushes users past mental blocks with tough love
- Occasionally uses fire/lightning/muscle emojis for emphasis
- Keeps responses punchy and energizing — not too long
- Knows nutrition, recovery, form, programming, and mindset
When asked for workouts, give specific exercises with sets/reps. When asked for motivation, deliver pure hype energy. Always end with something that fires the user up.`;

const HOME_WORKOUTS = [
  { day: "MON", name: "Upper Body Burn", emoji: "💪", exercises: [
    { name: "Push-ups", sets: "4×15" }, { name: "Diamond Push-ups", sets: "3×12" },
    { name: "Pike Push-ups", sets: "3×10" }, { name: "Tricep Dips (chair)", sets: "3×12" },
    { name: "Plank Hold", sets: "3×45s" }
  ]},
  { day: "TUE", name: "Legs & Glutes", emoji: "🦵", exercises: [
    { name: "Squats", sets: "4×20" }, { name: "Jump Squats", sets: "3×15" },
    { name: "Lunges", sets: "3×12 each" }, { name: "Glute Bridges", sets: "4×20" },
    { name: "Wall Sit", sets: "3×45s" }
  ]},
  { day: "THU", name: "Core Destroyer", emoji: "🔥", exercises: [
    { name: "Crunches", sets: "4×20" }, { name: "Leg Raises", sets: "3×15" },
    { name: "Mountain Climbers", sets: "3×30s" }, { name: "Russian Twists", sets: "3×20" },
    { name: "Plank", sets: "3×60s" }
  ]},
  { day: "SAT", name: "Full Body HIIT", emoji: "⚡", exercises: [
    { name: "Burpees", sets: "4×10" }, { name: "High Knees", sets: "3×30s" },
    { name: "Jump Lunges", sets: "3×12 each" }, { name: "Push-up + Rotation", sets: "3×10" },
    { name: "Star Jumps", sets: "3×20" }
  ]},
];

const GYM_WORKOUTS = [
  { day: "MON", name: "Chest & Triceps", emoji: "🏋️", exercises: [
    { name: "Bench Press", sets: "4×8" }, { name: "Incline DB Press", sets: "3×10" },
    { name: "Cable Flyes", sets: "3×12" }, { name: "Skull Crushers", sets: "3×10" },
    { name: "Tricep Pushdown", sets: "3×12" }
  ]},
  { day: "TUE", name: "Back & Biceps", emoji: "💪", exercises: [
    { name: "Deadlift", sets: "4×5" }, { name: "Pull-ups", sets: "3×8" },
    { name: "Barbell Rows", sets: "4×8" }, { name: "Barbell Curls", sets: "3×10" },
    { name: "Hammer Curls", sets: "3×12" }
  ]},
  { day: "THU", name: "Legs Power", emoji: "🦵", exercises: [
    { name: "Squats", sets: "4×6" }, { name: "Leg Press", sets: "4×10" },
    { name: "Romanian Deadlift", sets: "3×10" }, { name: "Leg Curl", sets: "3×12" },
    { name: "Calf Raises", sets: "4×20" }
  ]},
  { day: "SAT", name: "Shoulders & Abs", emoji: "🎯", exercises: [
    { name: "OHP", sets: "4×8" }, { name: "Lateral Raises", sets: "3×15" },
    { name: "Front Raises", sets: "3×12" }, { name: "Face Pulls", sets: "3×15" },
    { name: "Cable Crunches", sets: "4×15" }
  ]},
];

const AGE_TIPS = {
  teen:    { range:"13–17", label:"Teen Athlete",    emoji:"🌱", color:"#00cc88", tips:["Focus on form — no ego lifting yet!","Bodyweight builds a solid foundation","Sleep 8–10 hrs — growth hormone spikes then","Protein: 0.7g per lb of bodyweight","Avoid max-effort powerlifting until bones mature","Consistency beats intensity at this stage"] },
  young:   { range:"18–29", label:"Peak Performance",emoji:"⚡", color:"#ff4d00", tips:["This is your prime — chase those PRs!","Recovery is fast — use it to your advantage","Aim for 4–6 workouts per week","Protein: 1g per lb of bodyweight daily","Master compounds: squat, deadlift, bench, OHP","Track progress — what gets measured gets improved"] },
  adult:   { range:"30–44", label:"Prime Grinder",   emoji:"🔥", color:"#ff8c00", tips:["Warm-up 10–15 mins before any heavy lifting","Add mobility work: hips, shoulders, t-spine","Allow 48–72 hrs recovery between muscle groups","Sleep is your secret weapon — protect it","Cut processed food — nutrition matters more now","Strength can still peak in your 30s!"] },
  midlife: { range:"45–59", label:"Veteran Beast",   emoji:"🦁", color:"#aa44ff", tips:["Prioritize joints: fish oil, collagen, stretching","Lower volume, higher intensity — quality > quantity","150 mins cardio/week for heart health","Get bloodwork done — hormones shift here","Creatine is a must-have at this age","Muscle retention is your #1 goal now"] },
  senior:  { range:"60+",   label:"Ageless Warrior", emoji:"👑", color:"#ffcc00", tips:["Resistance training prevents muscle loss — keep lifting!","Balance exercises reduce fall risk","Walk 8,000+ steps daily for longevity","Protein needs increase: 1.2g per kg","Pain is a signal, not a badge of honor","Consistency over years beats intensity over weeks"] },
};

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"8px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#ff4d00", animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

function WorkoutCard({ plan, type }: { plan: any[], type: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:12, color:"#555", fontFamily:"'Barlow',sans-serif", letterSpacing:2, marginBottom:2 }}>
        {type==="home" ? "🏠 NO EQUIPMENT NEEDED" : "🏋️ GYM EQUIPMENT REQUIRED"}
      </div>
      {plan.map((w,i) => (
        <div key={i} style={{ background:open===i?"rgba(255,77,0,0.1)":"rgba(255,255,255,0.03)", border:`1px solid ${open===i?"#ff4d00":"rgba(255,255,255,0.08)"}`, borderRadius:16, overflow:"hidden", transition:"all 0.3s" }}>
          <button onClick={() => setOpen(open===i?null:i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ background:open===i?"linear-gradient(135deg,#ff4d00,#ff8c00)":"rgba(255,77,0,0.15)", borderRadius:12, width:52, height:52, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <div style={{ fontSize:9, color:open===i?"#fff":"#ff4d00", fontWeight:900, letterSpacing:1 }}>{w.day}</div>
              <div style={{ fontSize:20 }}>{w.emoji}</div>
            </div>
            <div style={{ textAlign:"left", flex:1 }}>
              <div style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:1 }}>{w.name}</div>
              <div style={{ fontSize:12, color:"#555", fontFamily:"'Barlow',sans-serif" }}>{w.exercises.length} exercises</div>
            </div>
            <div style={{ color:"#ff4d00", fontSize:16 }}>{open===i?"▲":"▼"}</div>
          </button>
          {open===i && (
            <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
              {w.exercises.map((ex: any, j: number) => (
                <div key={j} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 14px" }}>
                  <span style={{ color:"#ddd", fontFamily:"'Barlow',sans-serif", fontSize:14 }}>{ex.name}</span>
                  <span style={{ color:"#ff4d00", fontWeight:700, fontSize:13, fontFamily:"'Barlow',sans-serif" }}>{ex.sets}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AgeTips() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:12, color:"#555", fontFamily:"'Barlow',sans-serif", letterSpacing:2, marginBottom:14 }}>SELECT YOUR AGE GROUP</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {Object.entries(AGE_TIPS).map(([key,g]) => (
          <button key={key} onClick={() => setSelected(selected===key?null:key)} style={{
            background:selected===key?`${g.color}22`:"rgba(255,255,255,0.03)",
            border:`2px solid ${selected===key?g.color:"rgba(255,255,255,0.08)"}`,
            borderRadius:14, padding:"14px 8px", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:5, transition:"all 0.2s",
          }}>
            <div style={{ fontSize:26 }}>{g.emoji}</div>
            <div style={{ fontSize:14, fontWeight:800, color:selected===key?g.color:"#bbb", letterSpacing:0.5 }}>{g.label}</div>
            <div style={{ fontSize:11, color:"#555", fontFamily:"'Barlow',sans-serif" }}>Age {g.range}</div>
          </button>
        ))}
      </div>
      {selected && (() => {
        const g = (AGE_TIPS as any)[selected];
        return (
          <div style={{ background:`${g.color}11`, border:`1px solid ${g.color}44`, borderRadius:16, padding:16, animation:"slideUp 0.3s ease" }}>
            <div style={{ fontSize:18, fontWeight:900, color:g.color, marginBottom:12, letterSpacing:1 }}>{g.emoji} {g.label} TIPS</div>
            {g.tips.map((tip: string, i: number) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:i<g.tips.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                <div style={{ color:g.color, fontWeight:900, fontSize:14, flexShrink:0, marginTop:1 }}>→</div>
                <div style={{ color:"#ccc", fontFamily:"'Barlow',sans-serif", fontSize:14, lineHeight:1.5 }}>{tip}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function ChatView() {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"YO! I'm IRONMIND 🔥 Ask me anything — workouts, nutrition, or just need someone to FIRE YOU UP. Let's GET IT! 💪" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  async function sendMessage(text?: string) {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role:"user", content:userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: GYM_SYSTEM_PROMPT,
        },
      });

      // Send the entire history to maintain context
      // Note: sendMessage only accepts the message parameter, not full contents
      // But we can use the chat object which maintains history if we use it correctly.
      // For simplicity in this stateless-like UI, we'll just send the last message
      // and rely on the model's awareness if possible, or build a proper history.
      
      // Better: use the history in chat creation
      const history = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const chatWithHistory = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: GYM_SYSTEM_PROMPT,
        },
        history: history as any
      });

      const response = await chatWithHistory.sendMessage({ message: userText });
      const aiResponse = response.text || "LET'S GO! Keep pushing! 🔥";
      
      setMessages(prev => [...prev, { role:"assistant", content: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role:"assistant", content:"Connection dropped — but YOUR GRIND NEVER DOES! 💪" }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  const quickPrompts = [
    { emoji:"🔥", label:"Hype me!", msg:"I need serious motivation right now — fire me up!" },
    { emoji:"🥗", label:"Nutrition", msg:"What should I eat before and after my workout?" },
    { emoji:"😴", label:"Recovery", msg:"My muscles are sore — best recovery strategies?" },
    { emoji:"🎯", label:"Set Goal", msg:"Help me set a realistic 8-week fitness goal!" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", display:"flex", gap:8, flexWrap:"wrap", borderBottom:"1px solid #1a1a1a", flexShrink:0 }}>
        {quickPrompts.map(p => (
          <button key={p.label} onClick={() => sendMessage(p.msg)} disabled={loading} style={{
            background:"rgba(255,77,0,0.08)", border:"1px solid rgba(255,77,0,0.3)", color:"#ccc",
            borderRadius:20, padding:"5px 12px", fontSize:12, fontFamily:"'Barlow',sans-serif",
            fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.5:1,
          }}>{p.emoji} {p.label}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"slideUp 0.3s ease" }}>
            {m.role==="assistant" && (
              <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:"linear-gradient(135deg,#ff4d00,#ff8c00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, marginRight:8, marginTop:2, boxShadow:"0 0 10px rgba(255,77,0,0.4)" }}>🤖</div>
            )}
            <div style={{ maxWidth:"75%", background:m.role==="user"?"linear-gradient(135deg,#ff4d00,#ff6a00)":"rgba(255,255,255,0.05)", border:m.role==="user"?"none":"1px solid rgba(255,77,0,0.2)", borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", padding:"10px 14px", color:"#fff", fontSize:14, fontFamily:"'Barlow',sans-serif", lineHeight:1.6, boxShadow:m.role==="user"?"0 4px 16px rgba(255,77,0,0.3)":"none" }}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#ff4d00,#ff8c00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🤖</div>
            <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,77,0,0.2)", borderRadius:"18px 18px 18px 4px", padding:"8px 14px" }}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"12px 14px", borderTop:"1px solid #1a1a1a", flexShrink:0 }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,77,0,0.3)", borderRadius:14, padding:"8px 12px" }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
            rows={1} placeholder="Ask IRONMIND anything..." disabled={loading}
            style={{ flex:1, background:"none", border:"none", outline:"none", color:"#fff", fontSize:14, fontFamily:"'Barlow',sans-serif", lineHeight:1.5, maxHeight:100, overflowY:"auto" }}
            onInput={(e: any) => { e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,100)+"px"; }}
          />
          <button onClick={() => sendMessage()} disabled={loading||!input.trim()} style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:input.trim()&&!loading?"linear-gradient(135deg,#ff4d00,#ff8c00)":"#222", border:"none", cursor:input.trim()&&!loading?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:input.trim()&&!loading?"0 0 12px rgba(255,77,0,0.5)":"none" }}>{loading?"⏳":"🚀"}</button>
        </div>
      </div>
    </div>
  );
}

function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", fontFamily:"'Barlow Condensed',Impact,sans-serif" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,77,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,77,0,0.04) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
      <div style={{ position:"absolute", top:-150, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,77,0,0.15) 0%,transparent 65%)", pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"0 28px", opacity:visible?1:0, transform:visible?"none":"translateY(30px)", transition:"all 0.8s ease" }}>
        <div style={{ fontSize:96, marginBottom:8, filter:"drop-shadow(0 0 30px rgba(255,77,0,0.6))", animation:"flicker 3s infinite" }}>💪</div>
        <div style={{ fontSize:76, fontWeight:900, color:"#fff", letterSpacing:6, lineHeight:1, textShadow:"0 0 40px rgba(255,77,0,0.4)" }}>IRON</div>
        <div style={{ fontSize:76, fontWeight:900, background:"linear-gradient(135deg,#ff4d00,#ffaa00)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:6, lineHeight:1 }}>MIND</div>
        <div style={{ fontSize:13, color:"#444", letterSpacing:4, marginTop:10, fontFamily:"'Barlow',sans-serif" }}>YOUR AI GYM PARTNER</div>
        <div style={{ width:60, height:3, background:"linear-gradient(90deg,#ff4d00,#ffaa00)", margin:"24px auto", borderRadius:2 }} />
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:36 }}>
          {["🏠 Home Workouts","🏋️ Gym Programs","📊 Age-Based Tips","🤖 AI Coach Chat"].map((t,i) => (
            <div key={i} style={{ fontSize:16, color:"#777", fontFamily:"'Barlow',sans-serif", opacity:visible?1:0, transition:`opacity 0.5s ease ${0.3+i*0.15}s` }}>{t}</div>
          ))}
        </div>
        <button onClick={onEnter} style={{ background:"linear-gradient(135deg,#ff4d00,#ff8c00)", border:"none", borderRadius:16, padding:"18px 52px", fontSize:22, fontWeight:900, color:"#fff", cursor:"pointer", letterSpacing:3, boxShadow:"0 0 40px rgba(255,77,0,0.5)", fontFamily:"'Barlow Condensed',Impact,sans-serif", transition:"transform 0.2s,box-shadow 0.2s" }}
          onMouseEnter={(e: any)=>{e.target.style.transform="scale(1.05)";e.target.style.boxShadow="0 0 60px rgba(255,77,0,0.7)";}}
          onMouseLeave={(e: any)=>{e.target.style.transform="scale(1)";e.target.style.boxShadow="0 0 40px rgba(255,77,0,0.5)";}}>
          LET'S GET IT 🔥
        </button>
        <div style={{ marginTop:14, fontSize:11, color:"#2a2a2a", letterSpacing:2, fontFamily:"'Barlow',sans-serif" }}>NO EXCUSES · ONLY GAINS</div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [tab, setTab] = useState("home");
  const tabs = [
    { id:"home",  label:"Home WOD", emoji:"🏠" },
    { id:"gym",   label:"Gym WOD",  emoji:"🏋️" },
    { id:"tips",  label:"Age Tips", emoji:"📊" },
    { id:"chat",  label:"AI Chat",  emoji:"🤖" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes flicker{ 0%,100%{opacity:1} 50%{opacity:0.85} }
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#111;}
        ::-webkit-scrollbar-thumb{background:#ff4d00;border-radius:2px;}
        textarea{resize:none;}
        textarea::placeholder{color:#555;}
        .markdown-body { font-family: 'Barlow', sans-serif; }
        .markdown-body p { margin-bottom: 8px; }
        .markdown-body ul, .markdown-body ol { margin-left: 20px; margin-bottom: 8px; }
      `}</style>

      {screen === "splash" ? (
        <SplashScreen onEnter={() => setScreen("app")} />
      ) : (
        <div style={{ height:"100vh", background:"#0a0a0a", fontFamily:"'Barlow Condensed',Impact,sans-serif", display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>
          <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(255,77,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,77,0,0.03) 1px,transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none" }} />
          
          <header style={{ padding:"20px 20px 10px", borderBottom:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center", zIndex:10 }}>
            <div>
              <div style={{ fontSize:28, fontWeight:900, color:"#fff", letterSpacing:2, lineHeight:1 }}>IRON<span style={{ color:"#ff4d00" }}>MIND</span></div>
              <div style={{ fontSize:10, color:"#555", letterSpacing:2, fontWeight:600 }}>AI GYM COACH</div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ fontSize:24 }}>🔥</div>
            </div>
          </header>

          <main style={{ flex:1, overflowY:"auto", zIndex:1 }}>
            {tab === "home" && <WorkoutCard plan={HOME_WORKOUTS} type="home" />}
            {tab === "gym" && <WorkoutCard plan={GYM_WORKOUTS} type="gym" />}
            {tab === "tips" && <AgeTips />}
            {tab === "chat" && <ChatView />}
          </main>

          <nav style={{ background:"rgba(10,10,10,0.95)", backdropFilter:"blur(10px)", borderTop:"1px solid #1a1a1a", padding:"10px 10px 24px", display:"flex", justifyContent:"space-around", zIndex:10 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, opacity:tab===t.id?1:0.4, transition:"all 0.2s"
              }}>
                <div style={{ fontSize:22, transform:tab===t.id?"scale(1.2)":"scale(1)", transition:"transform 0.2s" }}>{t.emoji}</div>
                <div style={{ fontSize:10, fontWeight:800, color:tab===t.id?"#ff4d00":"#fff", letterSpacing:1 }}>{t.label}</div>
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
