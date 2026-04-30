import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '@/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('popup root missing');
createRoot(container).render(<Popup />);
