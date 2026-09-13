import fs from "node:fs";
import { scoreQuiz } from "./scoring.mjs";

const quiz=JSON.parse(fs.readFileSync(new URL("./quiz.json",import.meta.url),"utf8"));
if(quiz.items.length!==60) throw new Error("Expected 60 items");
const counts=Object.fromEntries(["BP","BW","CP","CF"].map(f=>[f,quiz.items.filter(x=>x.format===f).length]));
if(JSON.stringify(counts)!==JSON.stringify({BP:19,BW:20,CP:15,CF:6})) throw new Error("Bad format mix");
const burden=quiz.items.reduce((s,x)=>s+x.burden,0);
if(Math.abs(burden-88.7)>1e-9) throw new Error("Bad burden");

// Deterministic simple profile: answer first legal state for every item.
const answers={};
for(const item of quiz.items){
  if(item.format==="BP") answers[item.id]=1;
  if(item.format==="BW") answers[item.id]={best:item.options[0].id,worst:item.options[1].id};
  if(item.format==="CP") answers[item.id]={a:1,b:1};
  if(item.format==="CF") answers[item.id]={first:"A",second:"A"};
}
const a=scoreQuiz(quiz,answers);
const b=scoreQuiz(quiz,answers);
if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error("Scoring is not deterministic");
if(!a.primary) throw new Error("Expected a primary result");
console.log("OK",counts,"burden",burden,"primary",a.primary,"runnerUp",a.runnerUp);
