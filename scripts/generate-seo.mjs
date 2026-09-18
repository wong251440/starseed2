import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

const origin='https://starseed-steel.vercel.app';
const dist='dist';
const civilizations=JSON.parse(readFileSync('src/data/civilizations.json','utf8'));
const template=readFileSync(join(dist,'index.html'),'utf8');
const verification=(process.env.VITE_GOOGLE_SITE_VERIFICATION||'').trim();
const escapeHtml=(value='')=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const escapeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const markdownToHtml=markdown=>markdown.split(/\r?\n/).map(line=>{
 const safe=escapeHtml(line).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
 if(/^###\s/.test(line))return `<h3>${safe.slice(4)}</h3>`;
 if(/^##\s/.test(line))return `<h2>${safe.slice(3)}</h2>`;
 if(/^#\s/.test(line))return `<h1>${safe.slice(2)}</h1>`;
 return safe?`<p>${safe}</p>`:'';
}).join('\n');

const homeContent='<main><h1>你的靈魂，可能不是屬於地球。</h1><p>你的家鄉是來自哪一個星際文明？</p><h2>有些記憶，比這一生更古老。</h2><p>你現在雖然呼吸著地球的空氣、過著人類的生活，但你的意識深處，卻銘刻著其他星系的光芒。</p></main>';
const atlasContent=`<main><h1>你所熟悉的星光，也在尋找你。</h1><p>從文明的誕生，到靈魂在地球的使命。走進每一個星際世界的完整記憶。</p>${civilizations.map(c=>`<article><h2>${escapeHtml(c.name)}</h2><p>${escapeHtml(c.subtitle)}</p></article>`).join('')}</main>`;
const privacyContent='<main><h1>讓記憶留下，讓身份保持匿名。</h1><h2>完成測驗時會保存什麼</h2><p>完成 24 或 54 題後，網站會自動提交匿名校準資料。</p><h2>資料用來做什麼</h2><p>分析題目表現、分類邊界、匿名重測一致性與自我認同回饋，協助未來研究和建立明確的新模型版本。</p></main>';
const sampleContent='<main><h1>你的星際種子是：</h1><p>查看報告範例</p></main>';
const quizContent='<main><h1>21 文明星種測驗</h1><p>你的家鄉是來自哪一個星際文明？</p></main>';
const reportContent='<main><h1>你的星際檔案已準備完成</h1></main>';

function page({path,title,description,content,robots='index,follow,max-image-preview:large',image='/icons/23.webp',article}){
 const canonical=`${origin}${path}`;
 const jsonLd=article
  ? {'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.description,mainEntityOfPage:canonical,isPartOf:{'@type':'WebSite',name:'星際起源',url:origin}}
  : path==='/'
   ? [{'@context':'https://schema.org','@type':'WebSite',name:'星際起源',url:origin},{'@context':'https://schema.org','@type':'Organization',name:'星際起源',url:origin,logo:`${origin}/icons/23-small.webp`}]
   : {'@context':'https://schema.org','@type':'WebPage',name:title,description,url:canonical,isPartOf:{'@type':'WebSite',name:'星際起源',url:origin}};
 const metadata=[
  `<meta name="description" content="${escapeHtml(description)}"/>`,
  `<meta name="robots" content="${robots}"/>`,
  `<link rel="canonical" href="${canonical}"/>`,
  `<meta property="og:type" content="${article?'article':'website'}"/>`,
  `<meta property="og:locale" content="zh_TW"/>`,
  `<meta property="og:site_name" content="星際起源"/>`,
  `<meta property="og:title" content="${escapeHtml(title)}"/>`,
  `<meta property="og:description" content="${escapeHtml(description)}"/>`,
  `<meta property="og:url" content="${canonical}"/>`,
  `<meta property="og:image" content="${origin}${image}"/>`,
  '<meta name="twitter:card" content="summary_large_image"/>',
  `<meta name="twitter:title" content="${escapeHtml(title)}"/>`,
  `<meta name="twitter:description" content="${escapeHtml(description)}"/>`,
  `<meta name="twitter:image" content="${origin}${image}"/>`,
  verification?`<meta name="google-site-verification" content="${escapeHtml(verification)}"/>`:'',
  `<script type="application/ld+json">${escapeJson(jsonLd)}</script>`,
 ].filter(Boolean).join('');
 return template
  .replace(/<title>[\s\S]*?<\/title>/,`<title>${escapeHtml(title)}</title>`)
  .replace(/<meta name="description"[^>]*\/>/,metadata)
  .replace('<div id="root"></div>',`<div id="root"></div><noscript>${content}</noscript>`);
}

const baseDescription='穿越 60 道靈魂提問，探索你的星際起源。21 個文明、一份完整的專屬解析。';
const pages=[
 {path:'/',title:'21 文明星種測驗｜尋回你的星際起源',description:baseDescription,content:homeContent},
 {path:'/sample',title:'查看報告範例｜21 文明星種測驗',description:baseDescription,content:sampleContent},
 {path:'/civilizations',title:'文明圖鑑｜21 文明星種測驗',description:'從文明的誕生，到靈魂在地球的使命。走進每一個星際世界的完整記憶。',content:atlasContent},
 {path:'/privacy',title:'資料與隱私｜21 文明星種測驗',description:'讓記憶留下，讓身份保持匿名。',content:privacyContent},
 {path:'/quiz',title:'21 文明星種測驗｜尋回你的星際起源',description:baseDescription,content:quizContent,robots:'noindex,follow'},
 {path:'/report',title:'你的星際檔案已準備完成｜21 文明星種測驗',description:baseDescription,content:reportContent,robots:'noindex,nofollow'},
 ...civilizations.map(c=>{
  const article=readFileSync(`public/texts/${c.id}.md`,'utf8');
  return {path:`/civilizations/${c.id}`,title:`${c.name}文明｜21 文明星種測驗`,description:c.subtitle,content:`<main><h1>${escapeHtml(c.name)}</h1><p>${escapeHtml(c.subtitle)}</p>${markdownToHtml(article)}</main>`,image:`/icons/${c.id}.webp`,article:{title:c.title,description:c.subtitle}};
 }),
];

for(const item of pages){
 const file=item.path==='/'?join(dist,'index.html'):join(dist,item.path.slice(1),'index.html');
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,page(item));
}
writeFileSync(join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
const indexable=pages.filter(item=>!item.robots?.startsWith('noindex'));
writeFileSync(join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map(item=>`  <url><loc>${origin}${item.path}</loc></url>`).join('\n')}\n</urlset>\n`);
