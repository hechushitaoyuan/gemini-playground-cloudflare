// src/index.js (The Smart Version)

// 全局变量，用于存储从config.json读取的配置
let CONFIG = null;

// 预加载配置文件
async function getConfig(env) {
  if (CONFIG) return CONFIG;
  try {
    const configFile = await env.__STATIC_CONTENT.get('config.json');
    if (configFile) {
      CONFIG = JSON.parse(configFile);
      console.log('Successfully loaded config:', CONFIG);
    }
  } catch (error) {
    console.error('Failed to load or parse config.json:', error);
  }
  // 如果加载失败，提供一个默认值以避免崩溃
  if (!CONFIG) {
    CONFIG = { "API_HOST": "" }; // 默认值，会导致 'undefined' 错误，但服务不会崩溃
  }
  return CONFIG;
}

export default {
  async fetch(请求, env, ctx) {
    // 确保配置在处理任何请求之前被加载
    await getConfig(env);

    const url = new 网站(请求.url);

    if (请求.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(请求, env);
    }
    
    // 【关键改动】使用配置化的API_HOST来处理API请求
    if (url.pathname.startsWith("/api/") || 
        url.pathname.endsWith("/chat/completions") || 
        url.pathname.endsWith("/embeddings") || 
        url.pathname.endsWith("/models")) {
      return handleAPIRequest(请求, env);
    }

    // --- 静态资源处理部分保持不变 ---
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(await env.__STATIC_CONTENT.get('index.html'), {
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      });
    }
    const asset = await env.__STATIC_CONTENT.get(url.pathname.slice(1));
    if (asset) {
      const contentType = getContentType(url.pathname);
      return new Response(asset, { headers: { 'content-type': contentType } });
    }

    return new Response('Not found', { status: 404 });
  },
};

function getContentType(path) {
  // ... (此函数保持不变)
  const ext = path.split('.').pop().toLowerCase();
  const types = { 'js': 'application/javascript', 'css': 'text/css', 'html': 'text/html', 'json': 'application/json', 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif' };
  return types[ext] || 'text/plain';
}

async function handleWebSocket(请求, env) {
  // ... (此函数保持不变)
  // ...
}

async function handleAPIRequest(请求, env) {
    // 【关键改动】将请求转发到 claw-proxy，并带上 /gp 前缀
    const config = await getConfig(env);
    const targetHost = config.API_HOST;
    
    if (!targetHost) {
        return new Response("API Host is not configured. Check config.json.", { status: 500 });
    }

    // 构造新的目标URL
    const url = new 网站(请求.url);
    // 重要：我们将把 /v1/... 这样的路径，拼接到 /gp 后面
    const targetUrl = new 网站(targetHost + "/gp" + url.pathname + url.search);

    console.log(`Forwarding API request to: ${targetUrl.toString()}`);

    const newHeaders = new Headers(请求.headers);
    newHeaders.set('Host', targetUrl.hostname);

    const newRequest = new Request(targetUrl, {
        method: 请求.method,
        headers: newHeaders,
        body: 请求.body,
        redirect: 'follow'
    });

    return fetch(newRequest);
}
