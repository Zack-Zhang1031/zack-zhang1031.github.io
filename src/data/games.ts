export interface GameInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  poster: string;
  video: string;
  playUrl: string;
  platform: string;
  status: string;
  controls: string;
  updatedAt: string;
  version: string;
  tags: string[];
  accent: 'amber' | 'gold';
}

export const games: GameInfo[] = [
  {
    id: 'shuqian',
    name: '数钱',
    icon: '💰',
    description: '轻松休闲的点钞小游戏，考验你的手速与眼力。在限定时间内尽可能准确地清点钞票，挑战更高分数。',
    poster: '/images/shuqian-1.webp',
    video: '/videos/shuqian-demo.mp4',
    playUrl: '/games/shuqian/',
    platform: 'Web / HTML5',
    status: '可在线游玩',
    controls: '鼠标 / 触控',
    updatedAt: '2026-08-20',
    version: '2026.08.20',
    tags: ['休闲', '点击'],
    accent: 'amber',
  },
  {
    id: 'jianqian',
    name: '捡钱',
    icon: '💵',
    description: '欢乐的街机小游戏，操控角色接住天上掉落的金币与红包，躲开陷阱，比拼连击与高分。',
    poster: '/images/jianqian-1.webp',
    video: '/videos/jianqian-demo.mp4',
    playUrl: '/games/jianqian/',
    platform: 'Web / HTML5',
    status: '公开测试',
    controls: '鼠标 / 触控',
    updatedAt: '2026-08-25',
    version: '2026.08.25',
    tags: ['街机', '休闲'],
    accent: 'gold',
  },
  {
    id: 'rengpingzi',
    name: '扔瓶子',
    icon: '🧴',
    description: '写实暖房风格的瓶子投掷挑战。控制蓄力完成角色投掷、木板接力与特殊弹弓关卡，让瓶底稳稳落在平台上。',
    poster: '/images/rengpingzi-1.webp',
    video: '/videos/rengpingzi-demo.mp4',
    playUrl: '/games/rengpingzi/',
    platform: 'PC Web / 手机横屏',
    status: '公开测试',
    controls: '鼠标 / 触控 / 键盘',
    updatedAt: '2026-08-26',
    version: '2026.08.26',
    tags: ['物理', '休闲', '闯关'],
    accent: 'amber',
  },
];
