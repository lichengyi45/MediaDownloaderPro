const input = document.querySelector('#url');
const analyzeBtn = document.querySelector('#analyze');
const pasteBtn = document.querySelector('#paste');
const downloadBtn = document.querySelector('#download');
const result = document.querySelector('#result');
const downloadStatus = document.querySelector('#downloadStatus');
const installBtn = document.querySelector('#install');
let installPrompt = null;
let currentUrl = null;
let directFile = false;

function classify(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return {name:'TikTok', message:'Đã nhận diện link TikTok. Đây là link trang bài đăng; PWA chưa tự trích xuất ảnh/video từ trang này.', type:'social'};
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return {name:'Instagram', message:'Đã nhận diện link Instagram. Đây là link trang bài đăng; PWA chưa tự trích xuất ảnh/carousel từ trang này.', type:'social'};
  if (['youtube.com','youtu.be'].includes(host) || host.endsWith('.youtube.com')) return {name:'YouTube', message:'Đã nhận diện link YouTube. PWA hiện chưa trích xuất media từ trang này.', type:'social'};
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') return {name:'Facebook', message:'Đã nhận diện link Facebook. PWA hiện chưa trích xuất media từ trang này.', type:'social'};
  if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com') || host.endsWith('.twitter.com')) return {name:'X / Twitter', message:'Đã nhận diện link X/Twitter. PWA hiện chưa trích xuất media từ trang này.', type:'social'};
  const path = url.pathname.toLowerCase();
  const ext = path.match(/\.(mp4|m4v|mov|webm|mp3|m4a|aac|wav|flac|ogg|jpg|jpeg|png|webp|gif)(?:$)/);
  if (ext) return {name:'Tệp trực tiếp', message:`Có vẻ là URL tệp .${ext[1]}. Có thể thử tải bằng trình duyệt; máy chủ có thể giới hạn tải chéo nguồn.`, type:'direct'};
  return {name:'Website', message:'Đã nhận URL website. Chưa xác định được URL tệp trực tiếp.', type:'website'};
}

function show(kind, title, message) {
  result.className = `result ${kind}`;
  result.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = title;
  const span = document.createElement('span');
  span.textContent = message;
  result.append(strong, span);
}

function analyze(value = input.value.trim()) {
  let url;
  try { url = new URL(value); } catch { show('bad','Đường dẫn không hợp lệ','Hãy dán một URL đầy đủ bắt đầu bằng https:// hoặc http://.'); currentUrl=null; downloadBtn.disabled=true; return; }
  if (!['https:','http:'].includes(url.protocol)) { show('bad','Giao thức không được hỗ trợ','Chỉ chấp nhận URL HTTP hoặc HTTPS.'); currentUrl=null; downloadBtn.disabled=true; return; }
  currentUrl = url;
  const info = classify(url);
  directFile = info.type === 'direct';
  show(info.type === 'direct' ? 'good' : info.type === 'social' ? 'warn' : 'neutral', info.name, info.message);
  downloadBtn.disabled = !directFile;
  if (info.type === 'social') downloadStatus.textContent = 'Đã nhận link. Cần adapter được nền tảng cho phép để lấy media.';
  else downloadStatus.textContent = '';
  history.replaceState(null, '', `${location.pathname}?url=${encodeURIComponent(url.href)}`);
}

analyzeBtn.addEventListener('click', () => analyze());
input.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); });
pasteBtn.addEventListener('click', async () => {
  try { input.value = await navigator.clipboard.readText(); analyze(); }
  catch { show('warn','Không đọc được clipboard','Bạn hãy nhấn giữ ô nhập và chọn Dán.'); }
});

downloadBtn.addEventListener('click', () => {
  if (!currentUrl || !directFile) return;
  // Native browser download; intentionally no fetch/proxy to avoid CORS bypass.
  const a = document.createElement('a');
  a.href = currentUrl.href;
  a.rel = 'noopener noreferrer';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
  downloadStatus.textContent = 'Đã gửi yêu cầu tải cho trình duyệt. Việc lưu phụ thuộc máy chủ và Safari.';
});

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt=e; installBtn.hidden=false; });
installBtn.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt=null; installBtn.hidden=true; });

// Shortcut opens: https://YOUR-HOST/?url=<percent-encoded-shared-url>
const incoming = new URLSearchParams(location.search).get('url');
if (incoming) { input.value = incoming; analyze(incoming); }
else if (location.hash.startsWith('#url=')) { const v=decodeURIComponent(location.hash.slice(5)); input.value=v; analyze(v); }

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW registration failed',err)));
}
