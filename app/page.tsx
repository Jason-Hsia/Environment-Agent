import Workspace from './workspace';
import { documents,chunks } from '../lib/knowledge';
import { requireChatGPTUser } from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){await requireChatGPTUser('/');return <Workspace initialDocuments={documents} count={chunks.length}/>;}
