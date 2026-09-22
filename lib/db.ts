import { env } from 'cloudflare:workers';
export function database():D1Database {
  const db=(env as unknown as {DB?:D1Database}).DB;
  if(!db)throw new Error('知识库服务暂不可用，请稍后重试。');
  return db;
}
export function configuration() {
  const vars=env as unknown as Record<string,string|undefined>;
  const endpoint=vars.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const permitted=['dashscope.aliyuncs.com','api.deepseek.com'];
  const url=new URL(endpoint);
  if(url.protocol!=='https:' || !permitted.includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash)throw new Error('模型服务地址配置无效。');
  return {key:vars.AI_API_KEY,endpoint:endpoint.replace(/\/$/,''),model:vars.AI_MODEL || 'qwen-plus'};
}
