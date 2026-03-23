import { useState, useEffect, useRef } from 'react'
import { Show, useAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/react'
import './App.css'
import {
  addPendingOperation,
  clearUserCache,
  clearPendingOperations,
  getPendingOperations,
  getStaticJson,
  getUserCache,
  setStaticJson,
  setUserCache,
} from './lib/indexed-db.js'
import { fetchApiJson, setApiTokenProvider } from './lib/api-client.js'
import { getVerseDetailsFromStaticData } from './lib/bible-data.js'

const SYNC_DEBOUNCE_MS = 10 * 60 * 1000
const REVIEW_INTERVALS_IN_DAYS = [1, 2, 4, 7, 15, 30]
const GUEST_VERSES_PER_GROUP = 3
const TITLE_FONT_FAMILY = 'var(--font-title)'
const LOGO_FONT_FAMILY = 'var(--font-logo)'
const MOBILE_SEARCH_KEYWORDS = ['信心', '恩典', '爱', '因信称义', '真理']
const DEFAULT_CHINESE_VERSION = 'cuv'
const DEFAULT_ENGLISH_VERSION = 'niv'
const OLD_TESTAMENT_BOOKS = new Set([
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  'FirstSamuel', 'SecondSamuel', 'FirstKings', 'SecondKings', 'FirstChronicles', 'SecondChronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'SongOfSongs',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
]);

function getTestamentByVerseId(verseId) {
  const bookKey = String(verseId || '').split('_')[0];
  return OLD_TESTAMENT_BOOKS.has(bookKey) ? 'old' : 'new';
}

function normalizeChineseVersion(value) {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'cuv' ? 'cuv' : DEFAULT_CHINESE_VERSION;
}

function normalizeEnglishVersion(value) {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'esv' || normalized === 'niv' ? normalized : DEFAULT_ENGLISH_VERSION;
}

function resolveVersionSettings(userLike = {}) {
  return {
    chineseVersion: normalizeChineseVersion(userLike.chVersion || userLike.ch_version),
    englishVersion: normalizeEnglishVersion(userLike.enVersion || userLike.en_version),
  };
}

// 所有可用经文数据
const allVerses = [
  { id: 1, reference: 'John 3:16', referenceCN: '约翰福音 3:16', english: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', chinese: '神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。', keywords: ['神爱世人', '独生子', '不至灭亡', '反得永生'] },
  { id: 2, reference: 'Philippians 4:13', referenceCN: '腓立比书 4:13', english: 'I can do all things through Christ who strengthens me.', chinese: '我靠着那加给我力量的，凡事都能做。', keywords: ['靠着', '加给我力量', '凡事都能做'] },
  { id: 3, reference: 'Proverbs 3:5-6', referenceCN: '箴言 3:5-6', english: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', chinese: '你要专心仰赖耶和华，不可倚靠自己的聪明，在你一切所行的事上都要认定他，他必指引你的路。', keywords: ['专心仰赖', '耶和华', '不可倚靠', '认定他', '指引你的路'] },
  { id: 4, reference: 'Psalm 23:1', referenceCN: '诗篇 23:1', english: 'The Lord is my shepherd, I lack nothing.', chinese: '耶和华是我的牧者，我必不至缺乏。', keywords: ['耶和华', '我的牧者', '不至缺乏'] },
  { id: 5, reference: 'Romans 8:28', referenceCN: '罗马书 8:28', english: 'And we know that in all things God works for the good of those who love him.', chinese: '我们晓得万事都互相效力，叫爱神的人得益处。', keywords: ['万事', '互相效力', '爱神的人', '得益处'] },
  { id: 6, reference: 'Isaiah 40:31', referenceCN: '以赛亚书 40:31', english: 'But those who hope in the Lord will renew their strength.', chinese: '但那等候耶和华的必从新得力。', keywords: ['等候耶和华', '从新得力'] },
  { id: 7, reference: 'Jeremiah 29:11', referenceCN: '耶利米书 29:11', english: 'For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future.', chinese: '耶和华说：我知道我向你们所怀的意念是赐平安的意念，不是降灾祸的意念，要叫你们末后有指望。', keywords: ['赐平安', '末后有指望'] },
  { id: 8, reference: 'Matthew 11:28', referenceCN: '马太福音 11:28', english: 'Come to me, all you who are weary and burdened, and I will give you rest.', chinese: '凡劳苦担重担的人可以到我这里来，我就使你们得安息。', keywords: ['劳苦担重担', '得安息'] },
  { id: 9, reference: 'Psalm 46:1', referenceCN: '诗篇 46:1', english: 'God is our refuge and strength, an ever-present help in trouble.', chinese: '神是我们的避难所，是我们的力量，是我们在患难中随时的帮助。', keywords: ['避难所', '力量', '随时的帮助'] },
  { id: 10, reference: 'Mark 13:10', referenceCN: '马可福音 13:10', english: 'And the gospel must first be preached to all nations.', chinese: '然而，福音必须先传给万民。', keywords: ['福音', '传给万民'] },
  { id: 11, reference: 'Romans 1:16', referenceCN: '罗马书 1:16', english: 'For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes: first to the Jew, then to the Gentile.', chinese: '我不以福音为耻；这福音本是神的大能，要救一切相信的，先是犹太人，后是希腊人。', keywords: ['不以福音为耻', '神的大能', '救一切相信的'] },
];

// 经文列表集合
const verseCollections = [
  { id: 'grace', name: '关于恩典的经文', description: '精选关于神恩典的10节经文', count: 10, verses: [1, 2, 3, 4, 5], color: 'from-pink-500 to-rose-500', icon: '✨' },
  { id: 'faith', name: '关于信心的经文', description: '精选关于信心的12节经文', count: 12, verses: [2, 3, 6, 7, 8], color: 'from-blue-500 to-cyan-500', icon: '💪' },
  { id: 'children50', name: '儿童背经50句', description: '适合儿童背诵的50节经文', count: 50, verses: [1, 2, 3, 4, 5, 6, 7, 8, 9], color: 'from-yellow-400 to-orange-500', icon: '👶' },
  { id: 'hope', name: '关于盼望的经文', description: '在困境中带来盼望的经文', count: 8, verses: [6, 7, 8, 9], color: 'from-green-400 to-emerald-500', icon: '🌟' },
  { id: 'love', name: '关于爱的经文', description: '神的爱与彼此相爱的经文', count: 15, verses: [1, 2, 5], color: 'from-red-400 to-pink-500', icon: '❤️' },
  { id: 'gospel', name: '福音经文', description: '关于福音的大能', count: 2, verses: [10, 11], color: 'from-purple-500 to-indigo-500', icon: '📖' },
];

// 图标组件
const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);

const IconMoon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);

const IconSun = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const IconChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);

const IconChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

const IconParallel = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

const IconFirstLetter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18h16"/><path d="M8 18v-8a4 4 0 0 1 8 0v8"/><path d="M12 6V4"/></svg>
);

const IconFillIn = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
);

const IconBookOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

const IconBarChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

const IconLogOut = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

const IconStudy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const IconMedal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
);

const IconCamera = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);

const IconList = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
);

const IconBookmarkPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M12 7v6"/><path d="M9 10h6"/></svg>
);

const IconSparklesPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M19 16v5"/><path d="M16.5 18.5h5"/></svg>
);

const IconStackPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 4 8l8 4 8-4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/><path d="M20 4v6"/><path d="M17 7h6"/></svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
);

const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.06 12.34a1 1 0 0 1 0-.68C3.35 8.2 6.62 6 12 6s8.65 2.2 9.94 5.66a1 1 0 0 1 0 .68C20.65 15.8 17.38 18 12 18s-8.65-2.2-9.94-5.66"/><circle cx="12" cy="12" r="3"/></svg>
);

const IconEyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M9.88 5.09A9.76 9.76 0 0 1 12 4c5.38 0 8.65 2.2 9.94 5.66a1 1 0 0 1 0 .68 10.45 10.45 0 0 1-4.24 5.1"/><path d="M6.61 6.61A10.78 10.78 0 0 0 2.06 11.66a1 1 0 0 0 0 .68C3.35 15.8 6.62 18 12 18a9.8 9.8 0 0 0 5.39-1.61"/></svg>
);

const IconSync = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"/><path d="M8 16H3v5"/></svg>
);

const IconMessageSquare = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

// 首字母模式组件
function FirstLetterMode({ verse, darkMode, mobileFontLevel = 0 }) {
  const [revealedWords, setRevealedWords] = useState(new Set());
  const words = verse.english.split(' ');

  const handleWordClick = (index) => {
    setRevealedWords(prev => new Set([...prev, index]));
  };

  useEffect(() => {
    setRevealedWords(new Set());
  }, [verse?.id]);

  const textSizeClass = mobileFontLevel >= 4
    ? 'text-lg'
    : mobileFontLevel === 3
      ? 'text-xl'
      : mobileFontLevel === 2
        ? 'text-2xl'
        : mobileFontLevel === 1
          ? 'text-3xl'
          : 'text-4xl';
  const wordSpacingClass = mobileFontLevel >= 3 ? 'mb-0.5' : mobileFontLevel >= 1 ? 'mb-1' : 'mb-1';
  const lineHeightClass = mobileFontLevel >= 3 ? 'leading-normal' : 'leading-relaxed';

  return (
    <div className="text-center">
      <p className={`${textSizeClass} ${lineHeightClass} md:text-2xl md:leading-relaxed`} style={{ fontFamily: TITLE_FONT_FAMILY }}>
        {words.map((word, index) => {
          const isRevealed = revealedWords.has(index);
          return (
            <span key={index}>
              <span
                className={`inline-block ${wordSpacingClass} md:mb-2 cursor-pointer hover:opacity-80`}
                onClick={() => handleWordClick(index)}
              >
                {isRevealed ? (
                  <span>{word}</span>
                ) : (
                  <>
                    <span className="font-bold">{word.charAt(0).toUpperCase()}</span>
                    <span className="text-gray-400">{word.slice(1).replace(/[a-zA-Z]/g, '_')}</span>
                  </>
                )}
              </span>{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
}

function FillInMode({ verse, darkMode, mobileFontLevel = 0 }) {
  const [revealedWords, setRevealedWords] = useState(new Set());

  const handleWordClick = (index) => {
    setRevealedWords(prev => new Set([...prev, index]));
  };

  useEffect(() => {
    setRevealedWords(new Set());
  }, [verse?.id]);

  const blankSource = verse?.chineseBlank || verse?.chinese || '';
  const originalSource = verse?.chinese || blankSource;
  const segments = [];

  if (blankSource && originalSource && blankSource.includes('#')) {
    const blankParts = [];
    let blankCursor = 0;

    while (blankCursor < blankSource.length) {
      const isBlank = blankSource[blankCursor] === '#';
      let nextCursor = blankCursor + 1;

      while (nextCursor < blankSource.length && (blankSource[nextCursor] === '#') === isBlank) {
        nextCursor += 1;
      }

      blankParts.push({
        text: blankSource.slice(blankCursor, nextCursor),
        isBlank,
      });
      blankCursor = nextCursor;
    }

    let originalCursor = 0;

    blankParts.forEach((part, index) => {
      if (!part.isBlank) {
        if (originalSource.startsWith(part.text, originalCursor)) {
          segments.push({ token: part.text, isBlank: false });
          originalCursor += part.text.length;
        }
        return;
      }

      const nextLiteral = blankParts.slice(index + 1).find((item) => !item.isBlank)?.text || '';

      if (!nextLiteral) {
        const remaining = originalSource.slice(originalCursor);
        if (remaining) {
          segments.push({ token: remaining, isBlank: true });
        }
        originalCursor = originalSource.length;
        return;
      }

      const nextLiteralIndex = originalSource.indexOf(nextLiteral, originalCursor);

      if (nextLiteralIndex === -1) {
        const remaining = originalSource.slice(originalCursor);
        if (remaining) {
          segments.push({ token: remaining, isBlank: true });
          originalCursor = originalSource.length;
        }
        return;
      }

      if (nextLiteralIndex > originalCursor) {
        segments.push({
          token: originalSource.slice(originalCursor, nextLiteralIndex),
          isBlank: true,
        });
      }

      originalCursor = nextLiteralIndex;
    });
  } else if (originalSource) {
    segments.push({
      token: originalSource,
      isBlank: false,
    });
  }

  const textSizeClass = mobileFontLevel >= 4
    ? 'text-sm'
    : mobileFontLevel === 3
      ? 'text-base'
      : mobileFontLevel === 2
        ? 'text-lg'
        : mobileFontLevel === 1
          ? 'text-xl'
          : 'text-2xl';
  const lineHeightClass = mobileFontLevel >= 3 ? 'leading-normal' : 'leading-relaxed';
  const blankSizeClass = mobileFontLevel >= 3 ? 'mx-0.5 my-0.5 px-1.5 py-0.5' : mobileFontLevel >= 1 ? 'mx-0.5 my-0.5 px-2 py-0.5' : 'mx-1 my-1 px-2 py-1';

  return (
    <div className="text-center">
      <p className={`${textSizeClass} ${lineHeightClass} md:text-2xl md:leading-relaxed`} style={{ fontFamily: TITLE_FONT_FAMILY }}>
        {segments.map((segment, index) => {
          if (!segment.isBlank) {
            return <span key={`text-${index}`}>{segment.token}</span>;
          }

          const isRevealed = revealedWords.has(index);
          const blankWidth = `${Math.max(segment.token.length, 2)}ch`;

          return (
            <button
              key={`blank-${index}`}
              type="button"
              onClick={() => !isRevealed && handleWordClick(index)}
              className={`inline-flex items-center justify-center ${blankSizeClass} rounded border-b-2 transition-all align-baseline ${isRevealed
                ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
                : 'bg-primary/10 text-primary border-primary hover:bg-primary/20'
              }`}
              style={{ minWidth: blankWidth }}
            >
              {isRevealed ? segment.token : '?'}
            </button>
          );
        })}
      </p>
      <p className="hidden md:block text-sm md:text-base leading-relaxed mt-4 md:mt-6 text-gray-500 dark:text-gray-300 italic">
        {verse.english}
      </p>
    </div>
  );
}

function getLocalNextReviewDate(nextReviewCount) {
  const offsetDays = REVIEW_INTERVALS_IN_DAYS[Math.min(nextReviewCount - 1, REVIEW_INTERVALS_IN_DAYS.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  return next.toISOString();
}

function mergeSelectedUsers(selectedUsers, currentUser) {
  const nextUsers = Array.isArray(selectedUsers) ? [...selectedUsers] : [];

  if (!currentUser?.id || nextUsers.some((item) => item.id === currentUser.id)) {
    return nextUsers;
  }

  nextUsers.push({
    id: currentUser.id,
    username: currentUser.username,
    image_url: currentUser.imageUrl,
    joined_at: new Date().toISOString(),
  });

  return nextUsers;
}

function applyReviewMutation(memorizationData, payload) {
  if (payload.action === 'skip') {
    return memorizationData;
  }

  const activeVerses = [...memorizationData.activeVerses];
  const masteredVerses = [...memorizationData.masteredVerses];
  const verseIndex = activeVerses.findIndex((item) => item.userVerseId === payload.userVerseId);

  if (verseIndex === -1) {
    return memorizationData;
  }

  const verse = activeVerses[verseIndex];

  if (payload.action === 'mastered') {
    const nextReviewCount = (verse.reviewCount || 0) + 1;
    const updatedVerse = {
      ...verse,
      status: 'mastered',
      reviewCount: nextReviewCount,
      masteryDate: new Date().toISOString(),
      nextReviewDate: getLocalNextReviewDate(nextReviewCount),
      modifiedAt: new Date().toISOString(),
    };

    activeVerses.splice(verseIndex, 1);
    masteredVerses.push(updatedVerse);

    return { activeVerses, masteredVerses };
  }

  activeVerses[verseIndex] = {
    ...verse,
    status: verse.status === 'relearning' ? 'relearning' : 'learning',
    nextReviewDate: null,
    modifiedAt: new Date().toISOString(),
  };

  return { activeVerses, masteredVerses };
}

function applySelectPlanMutation(memorizationData, planVerses, clearCurrent, planId) {
  let activeVerses = [...memorizationData.activeVerses];
  let masteredVerses = [...memorizationData.masteredVerses];

  if (clearCurrent) {
    const relearningVerses = activeVerses
      .filter((verse) => verse.status === 'relearning')
      .map((verse) => ({
        ...verse,
        status: 'mastered',
        nextReviewDate: null,
        modifiedAt: new Date().toISOString(),
      }));

    activeVerses = activeVerses.filter((verse) => verse.status !== 'learning' && verse.status !== 'relearning');
    masteredVerses = [...masteredVerses, ...relearningVerses];
  }

  const activeByVerseId = new Map(activeVerses.map((verse) => [verse.id, verse]));
  const masteredByVerseId = new Map(masteredVerses.map((verse) => [verse.id, verse]));

  for (const verse of planVerses) {
    if (!activeByVerseId.has(verse.id) && !masteredByVerseId.has(verse.id)) {
      activeVerses.push({
        ...verse,
        userVerseId: `local-${planId}-${verse.id}`,
        status: 'learning',
        reviewCount: 0,
        nextReviewDate: null,
        masteryDate: null,
        modifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    if (masteredByVerseId.has(verse.id)) {
      const masteredVerse = masteredByVerseId.get(verse.id);
      masteredVerses = masteredVerses.filter((item) => item.id !== verse.id);
      activeVerses.push({
        ...masteredVerse,
        ...verse,
        status: 'relearning',
        reviewCount: 0,
        masteryDate: null,
        nextReviewDate: null,
        modifiedAt: new Date().toISOString(),
      });
    }
  }

  return { activeVerses, masteredVerses };
}

function applyAddVerseMutation(memorizationData, verse) {
  const activeVerses = [...memorizationData.activeVerses];
  const masteredVerses = [...memorizationData.masteredVerses];
  const activeIndex = activeVerses.findIndex((item) => item.id === verse.id);
  const masteredIndex = masteredVerses.findIndex((item) => item.id === verse.id);

  if (activeIndex !== -1) {
    return memorizationData;
  }

  if (masteredIndex !== -1) {
    const masteredVerse = masteredVerses[masteredIndex];
    masteredVerses.splice(masteredIndex, 1);
    activeVerses.unshift({
      ...masteredVerse,
      ...verse,
      status: 'relearning',
      reviewCount: 0,
      masteryDate: null,
      nextReviewDate: null,
      modifiedAt: new Date().toISOString(),
    });

    return { activeVerses, masteredVerses };
  }

  activeVerses.unshift({
    ...verse,
    userVerseId: `local-search-${verse.id}`,
    status: 'learning',
    reviewCount: 0,
    nextReviewDate: null,
    masteryDate: null,
    modifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  return { activeVerses, masteredVerses };
}

function applyRemoveVerseMutation(memorizationData, verseId) {
  return {
    activeVerses: (memorizationData.activeVerses || []).filter((item) => item.id !== verseId && item.verseId !== verseId),
    masteredVerses: memorizationData.masteredVerses || [],
  };
}

function moveActiveVerseToFront(memorizationData, verseId) {
  if (!memorizationData || !verseId) {
    return memorizationData;
  }

  const activeVerses = [...(memorizationData.activeVerses || [])];
  const verseIndex = activeVerses.findIndex((item) => item.id === verseId || item.verseId === verseId);

  if (verseIndex <= 0) {
    return memorizationData;
  }

  const [targetVerse] = activeVerses.splice(verseIndex, 1);
  activeVerses.unshift(targetVerse);

  return {
    ...memorizationData,
    activeVerses,
  };
}

function buildBibleSearchResults(combinedData, query, versions = { chineseVersion: DEFAULT_CHINESE_VERSION, englishVersion: DEFAULT_ENGLISH_VERSION }) {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  if (!combinedData || !trimmedQuery) {
    return [];
  }

  const chineseVersion = normalizeChineseVersion(versions.chineseVersion);
  const englishVersion = normalizeEnglishVersion(versions.englishVersion);
  const results = [];

  for (const [, book] of Object.entries(combinedData)) {
    for (const [chapterKey, chapter] of Object.entries(book.chapters || {})) {
      for (const [verseKey, verse] of Object.entries(chapter || {})) {
        const reference = `${book.bookEn} ${chapterKey}:${verseKey}`;
        const referenceCN = `${book.bookZh} ${chapterKey}:${verseKey}`;
        const chinese = verse[chineseVersion] || verse.cuv || '';
        const english = verse[englishVersion] || verse.niv || verse.esv || '';

        if (
          chinese.includes(trimmedQuery) ||
          english.toLowerCase().includes(normalizedQuery)
        ) {
          results.push({
            id: `${book.bookEn}_${chapterKey}_${verseKey}`,
            reference,
            referenceCN,
            chinese,
            english,
          });
        }
      }
    }
  }

  return results.slice(0, 200);
}

function getSearchTokens(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const parts = trimmedQuery
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [trimmedQuery];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text, query) {
  if (!text) {
    return text;
  }

  const tokens = getSearchTokens(query);

  if (tokens.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    const isMatch = tokens.some((token) => part.toLowerCase() === token.toLowerCase());

    if (!isMatch) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark
        key={`${part}-${index}`}
        className="rounded px-1 py-0.5"
        style={{ backgroundColor: '#fef08a', color: '#854d0e' }}
      >
        {part}
      </mark>
    );
  });
}

function hydrateVerseRecord(record, staticData, settings) {
  if (!record) {
    return record
  }

  const verseId = record.verseId || record.verse_id || record.id
  if (!verseId || !staticData?.combined || !staticData?.frequent) {
    return {
      ...record,
      id: verseId || record.id,
      verseId: verseId || record.verseId,
    }
  }

  return {
    ...record,
    ...getVerseDetailsFromStaticData(verseId, staticData.combined, staticData.frequent, {
      english: settings.englishVersion,
      chinese: settings.chineseVersion,
    }),
  }
}

function hydratePlanDetail(detail, staticData, settings) {
  if (!detail) {
    return detail
  }

  return {
    plan: {
      ...detail.plan,
      selected_users: Array.isArray(detail.plan?.selected_users) ? detail.plan.selected_users : [],
    },
    verses: (detail.verses || []).map((verse) => hydrateVerseRecord(verse, staticData, settings)),
  }
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('memorization');
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [viewMode, setViewMode] = useState('parallel');
  const [mobileParallelLanguage, setMobileParallelLanguage] = useState('chinese');
  const [masteredVerses, setMasteredVerses] = useState([
    { id: 1, date: '2024-03-10', reviewCount: 3 },
    { id: 2, date: '2024-03-11', reviewCount: 2 }
  ]);
  const [skippedVerses, setSkippedVerses] = useState([]);
  const [currentVerses, setCurrentVerses] = useState([1, 2, 3]);
  const [showNextGroupModal, setShowNextGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTestamentFilter, setSearchTestamentFilter] = useState('all');
  const [searchLoading, setSearchLoading] = useState(false);
  const [staticDataUpdating, setStaticDataUpdating] = useState(false);
  const [staticDataMessage, setStaticDataMessage] = useState('');

  const [settings, setSettings] = useState({
    chineseVersion: DEFAULT_CHINESE_VERSION,
    englishVersion: DEFAULT_ENGLISH_VERSION,
  });
  const [versionDraft, setVersionDraft] = useState({
    chineseVersion: DEFAULT_CHINESE_VERSION,
    englishVersion: DEFAULT_ENGLISH_VERSION,
  });
  const [isSavingVersionSettings, setIsSavingVersionSettings] = useState(false);
  const [versionSettingsMessage, setVersionSettingsMessage] = useState('');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [guestRainbowVerses, setGuestRainbowVerses] = useState([]);
  const [dbUserProfile, setDbUserProfile] = useState(null);
  const [authMode, setAuthMode] = useState('sign-in');
  const [authNickname, setAuthNickname] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authStep, setAuthStep] = useState('credentials');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [feedbackSubmitError, setFeedbackSubmitError] = useState('');
  const [feedbackSubmitSuccess, setFeedbackSubmitSuccess] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [myFeedbackItems, setMyFeedbackItems] = useState([]);
  const [myFeedbackLoading, setMyFeedbackLoading] = useState(false);
  const [myFeedbackError, setMyFeedbackError] = useState('');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanVerses, setSelectedPlanVerses] = useState([]);
  const [selectedPlanLoading, setSelectedPlanLoading] = useState(false);
  const [selectedPlanError, setSelectedPlanError] = useState('');
  const [showSelectPlanModal, setShowSelectPlanModal] = useState(false);
  const [clearCurrentPlanSelection, setClearCurrentPlanSelection] = useState(false);
  const [isSelectingPlan, setIsSelectingPlan] = useState(false);
  const [memorizationData, setMemorizationData] = useState({ activeVerses: [], masteredVerses: [] });
  const [memorizationLoading, setMemorizationLoading] = useState(false);
  const [memorizationError, setMemorizationError] = useState('');
  const [manualSyncing, setManualSyncing] = useState(false);
  const [syncOverlay, setSyncOverlay] = useState({ visible: false, text: '' });
  const [dataDownloadOverlay, setDataDownloadOverlay] = useState({ visible: false, text: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [progressView, setProgressView] = useState('mastered');
  const [staticDataRevision, setStaticDataRevision] = useState(0);
  const [mobileFontLevel, setMobileFontLevel] = useState(0);
  const [mobileDragX, setMobileDragX] = useState(0);
  const [isMobileDragAnimating, setIsMobileDragAnimating] = useState(false);
  const [mobileViewportWidth, setMobileViewportWidth] = useState(0);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(76);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [studyFallbackVerse, setStudyFallbackVerse] = useState(null);
  const leaderboardPageSize = 10;

  const cardRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const avatarInputRef = useRef(null);
  const accountMenuRef = useRef(null);
  const authCodeInputRefs = useRef([]);
  const planDetailsCacheRef = useRef({});
  const cacheSnapshotRef = useRef({ plans: [], planDetails: {}, memorizationData: { activeVerses: [], masteredVerses: [] } });
  const syncTimeoutRef = useRef(null);
  const syncOverlayTimeoutRef = useRef(null);
  const mobileViewportRef = useRef(null);
  const mobileHeaderRef = useRef(null);
  const touchDragMetaRef = useRef({ active: false, horizontal: false, startX: 0, startY: 0 });
  const pendingMobileFlipRef = useRef(0);
  const verseContentRef = useRef(null);
  const staticDataRef = useRef({ combined: null, frequent: null });
  const authAutoSubmitRef = useRef(false);
  const { signOut, openSignIn, openSignUp, loaded: isClerkLoaded } = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { getToken } = useAuth();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const authReady = isClerkLoaded && (authMode === 'sign-in' ? !!signIn : !!signUp);

  useEffect(() => {
    setApiTokenProvider(async () => {
      try {
        return await getToken()
      } catch {
        return null
      }
    })

    return () => {
      setApiTokenProvider(null)
    }
  }, [getToken]);

  const normalizeSelectedUsers = (selectedUsers) => {
    const rawUsers = Array.isArray(selectedUsers)
      ? selectedUsers
      : typeof selectedUsers === 'string'
        ? (() => {
          try {
            return JSON.parse(selectedUsers);
          } catch (_error) {
            return [];
          }
        })()
        : [];

    const dedupedUsers = [];
    const seenIds = new Set();

    rawUsers.forEach((selectedUser) => {
      const normalizedUser = {
        id: selectedUser?.id || selectedUser?.user_id || selectedUser?.clerk_user_id || '',
        username: selectedUser?.username || selectedUser?.user_name || '',
        image_url: selectedUser?.image_url || selectedUser?.imageUrl || '',
        joined_at: selectedUser?.joined_at || null,
      };

      if (!normalizedUser.id || seenIds.has(normalizedUser.id)) {
        return;
      }

      seenIds.add(normalizedUser.id);
      dedupedUsers.push(normalizedUser);
    });

    return dedupedUsers;
  };

  const getStaticDataSnapshot = async ({ requireFrequent = false, requireCombined = false } = {}) => {
    let combined = staticDataRef.current.combined;
    let frequentData = staticDataRef.current.frequent;

    if (!combined) {
      combined = await getStaticJson('combined');
    }

    if (!frequentData) {
      frequentData = await getStaticJson('frequent');
    }

    if (requireFrequent && !frequentData) {
      throw new Error('本地 frequent 数据尚未下载完成');
    }

    if (requireCombined && !combined) {
      throw new Error('本地 combined 数据尚未下载完成');
    }

    staticDataRef.current = { combined, frequent: frequentData };
    return staticDataRef.current;
  };

  const ensureStaticJsonCached = async (name, { force = false } = {}) => {
    const existing = await getStaticJson(name);

    if (existing && !force) {
      staticDataRef.current = {
        ...staticDataRef.current,
        [name]: existing,
      };
      return existing;
    }

    const response = await fetch(`/data/${name}.json`, {
      cache: force ? 'no-store' : 'default',
    });

    if (!response.ok) {
      throw new Error(`下载 ${name}.json 失败`);
    }

    const data = await response.json();
    await setStaticJson(name, data);
    staticDataRef.current = {
      ...staticDataRef.current,
      [name]: data,
    };
    setStaticDataRevision((prev) => prev + 1);
    return data;
  };

  const refreshStaticBibleData = async () => {
    try {
      setStaticDataUpdating(true);
      setStaticDataMessage('');
      await ensureStaticJsonCached('frequent', { force: true });
      await ensureStaticJsonCached('combined', { force: true });
      setStaticDataMessage('圣经数据已更新');

      if (isSignedIn) {
        await loadBootstrapData(false);
      }
    } catch (error) {
      setStaticDataMessage(error.message || '更新圣经数据失败');
    } finally {
      setStaticDataUpdating(false);
    }
  };

  const preloadPlanDetails = async (planId) => {
    if (planDetailsCacheRef.current[planId]) {
      const cachedDetail = planDetailsCacheRef.current[planId];
      const fallbackPlan = plans.find((plan) => plan.id === planId);
      const fallbackSelectedUsers = normalizeSelectedUsers(fallbackPlan?.selected_users);

      if ((cachedDetail.plan?.selected_users || []).length === 0 && fallbackSelectedUsers.length > 0) {
        const nextDetail = {
          ...cachedDetail,
          plan: {
            ...cachedDetail.plan,
            selected_users: fallbackSelectedUsers,
          },
        };
        planDetailsCacheRef.current[planId] = nextDetail;
        return nextDetail;
      }

      return cachedDetail;
    }

    const result = await fetchApiJson(`/api/plans/${planId}`);
    const staticData = await getStaticDataSnapshot({ requireFrequent: true });
    const detail = hydratePlanDetail({
      plan: {
        ...result.plan,
        selected_users: normalizeSelectedUsers(result.plan?.selected_users),
      },
      verses: result.verses || [],
    }, staticData, settings);

    planDetailsCacheRef.current[planId] = detail;
    await persistUserSnapshot({
      planDetails: {
        ...cacheSnapshotRef.current.planDetails,
        [planId]: detail,
      },
    });
    return detail;
  };

  const loadPlans = async () => {
    await loadBootstrapData();
  };

  const loadPlanDetails = async (planId, nextTab = 'plan-detail') => {
    try {
      setSelectedPlanLoading(true);
      setSelectedPlanError('');
      setSelectedPlanId(planId);
      const result = await preloadPlanDetails(planId);
      setSelectedPlan(result.plan);
      setSelectedPlanVerses(result.verses);
      setActiveTab(nextTab);
    } catch (error) {
      setSelectedPlanError(error.message);
    } finally {
      setSelectedPlanLoading(false);
    }
  };

  const loadMemorizationData = async () => {
    await loadBootstrapData();
  };

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError('');
      const result = await fetchApiJson('/api/leaderboard');
      setLeaderboardData(
        (result.leaderboard || []).map((item) => ({
          id: item.id,
          name: item.username || '用户',
          avatar: item.image_url || '',
          masteredCount: Number(item.mastered_count || 0),
        })),
      );
      setLeaderboardPage(1);
    } catch (error) {
      setLeaderboardError(error.message || '读取排行榜失败');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadPublicPlans = async () => {
    try {
      setPlansLoading(true);
      setPlansError('');
      await ensureStaticJsonCached('frequent');
      void ensureStaticJsonCached('combined').catch(() => {});
      const result = await fetchApiJson('/api/plans');
      const nextPlans = (result.plans || []).map((plan) => ({
        ...plan,
        selected_users: normalizeSelectedUsers(plan.selected_users),
      }));
      setPlans(nextPlans);

      const rainbowPlanId = 'plan_rainbow_memorization';
      const rainbowDetailResult = await fetchApiJson(`/api/plans/${rainbowPlanId}`);
      const staticData = await getStaticDataSnapshot({ requireFrequent: true });
      const rainbowDetail = hydratePlanDetail({
        plan: {
          ...rainbowDetailResult.plan,
          selected_users: normalizeSelectedUsers(rainbowDetailResult.plan?.selected_users),
        },
        verses: rainbowDetailResult.verses || [],
      }, staticData, settings);

      setGuestRainbowVerses(rainbowDetail.verses || []);
    } catch (error) {
      setPlansError(error.message || '读取计划失败');
      setGuestRainbowVerses([]);
    } finally {
      setPlansLoading(false);
    }
  };

  const getDefaultDisplayName = (email = '') => {
    const localPart = email.split('@')[0] || 'user';
    return localPart || '用户';
  };

  const primaryEmail = user?.primaryEmailAddress?.emailAddress || '';
  const displayedAvatar = avatarPreview || user?.imageUrl || '';
  const displayUsername = savedUsername || dbUserProfile?.username || usernameInput || user?.firstName || '用户';

  const pickRandomStudyVerse = async () => {
    const staticData = await getStaticDataSnapshot({ requireFrequent: true });
    const frequentVerses = Array.isArray(staticData.frequent)
      ? staticData.frequent.filter((verse) => verse?.verse_id)
      : [];

    if (frequentVerses.length === 0) {
      return null;
    }

    const randomVerse = frequentVerses[Math.floor(Math.random() * frequentVerses.length)];
    return getVerseDetailsFromStaticData(randomVerse.verse_id, staticData.combined, staticData.frequent, {
      english: settings.englishVersion,
      chinese: settings.chineseVersion,
    });
  };

  const resetSignedInUserState = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setDbUserProfile(null);
    setUsernameInput('');
    setSavedUsername('');
    setAvatarPreview('');
    setSelectedAvatarFile(null);
    setProfileError('');
    setProfileSuccess('');
    setDeleteAccountError('');
    setShowDeleteAccountModal(false);
    setPlans([]);
    setPlansError('');
    setMemorizationData({ activeVerses: [], masteredVerses: [] });
    setMemorizationError('');
    setMasteredVerses([]);
    setSkippedVerses([]);
    setCurrentVerseIndex(0);
    setSelectedPlanId(null);
    setSelectedPlan(null);
    setSelectedPlanVerses([]);
    setSelectedPlanError('');
    setSelectedPlanLoading(false);
    setShowSelectPlanModal(false);
    setClearCurrentPlanSelection(false);
    setIsSelectingPlan(false);
    setLeaderboardData([]);
    setLeaderboardError('');
    setManualSyncing(false);
    setSyncOverlay({ visible: false, text: '' });
    setDataDownloadOverlay({ visible: false, text: '' });
    setFeedbackInput('');
    setFeedbackSubmitError('');
    setFeedbackSubmitSuccess('');
    setIsSubmittingFeedback(false);
    setMyFeedbackItems([]);
    setMyFeedbackLoading(false);
    setMyFeedbackError('');
    planDetailsCacheRef.current = {};
    cacheSnapshotRef.current = { plans: [], planDetails: {}, memorizationData: { activeVerses: [], masteredVerses: [] } };

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (syncOverlayTimeoutRef.current) {
      clearTimeout(syncOverlayTimeoutRef.current);
      syncOverlayTimeoutRef.current = null;
    }

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const persistUserSnapshot = async (overrides = {}) => {
    if (!user?.id) return;

    const snapshot = {
      plans: cacheSnapshotRef.current.plans,
      planDetails: cacheSnapshotRef.current.planDetails,
      memorizationData: cacheSnapshotRef.current.memorizationData,
      ...overrides,
    };

    cacheSnapshotRef.current = snapshot;
    await setUserCache(user.id, snapshot);
  };

  const applyBootstrapPayload = async (payload) => {
    const nextSettings = resolveVersionSettings(payload?.user || {});
    setSettings(nextSettings);
    setDbUserProfile(payload?.user || null);
    const staticData = await getStaticDataSnapshot({ requireFrequent: true });
    const nextPlans = (payload.plans || []).map((plan) => ({
      ...plan,
      selected_users: normalizeSelectedUsers(plan.selected_users),
    }));
    const nextPlanDetails = Object.fromEntries(
      Object.entries(payload.planDetails || {}).map(([planId, detail]) => [
        planId,
        hydratePlanDetail(detail, staticData, nextSettings),
      ]),
    );
    const nextMemorizationData = {
      activeVerses: (payload.memorizationData?.activeVerses || []).map((item) => hydrateVerseRecord(item, staticData, nextSettings)),
      masteredVerses: (payload.memorizationData?.masteredVerses || []).map((item) => hydrateVerseRecord(item, staticData, nextSettings)),
    };

    setPlans(nextPlans);
    planDetailsCacheRef.current = nextPlanDetails;
    setMemorizationData(nextMemorizationData);

    if (selectedPlanId && nextPlanDetails[selectedPlanId]) {
      setSelectedPlan(nextPlanDetails[selectedPlanId].plan);
      setSelectedPlanVerses(nextPlanDetails[selectedPlanId].verses || []);
    }

    await persistUserSnapshot({
      plans: nextPlans,
      planDetails: nextPlanDetails,
      memorizationData: nextMemorizationData,
    });
  };

  const loadBootstrapData = async (showLoader = true) => {
    if (!isSignedIn) return;

    try {
      const frequentCacheTask = ensureStaticJsonCached('frequent');
      void ensureStaticJsonCached('combined').catch(() => {});
      await frequentCacheTask;

      if (showLoader) {
        setPlansLoading(true);
        setMemorizationLoading(true);
      }
      setPlansError('');
      setMemorizationError('');
      const result = await fetchApiJson('/api/bootstrap');
      await applyBootstrapPayload(result);
    } catch (error) {
      try {
        const [plansResult, memorizationResult] = await Promise.all([
          fetchApiJson('/api/plans'),
          fetchApiJson('/api/memorization'),
        ]);

        const nextPlans = (plansResult.plans || []).map((plan) => ({
          ...plan,
          selected_users: normalizeSelectedUsers(plan.selected_users),
        }));
        const staticData = await getStaticDataSnapshot({ requireFrequent: true });
        const nextMemorizationData = {
          activeVerses: (memorizationResult.activeVerses || []).map((item) => hydrateVerseRecord(item, staticData, settings)),
          masteredVerses: (memorizationResult.masteredVerses || []).map((item) => hydrateVerseRecord(item, staticData, settings)),
        };

        setPlans(nextPlans);
        setMemorizationData(nextMemorizationData);

        nextPlans.forEach((plan) => {
          void preloadPlanDetails(plan.id);
        });

        await persistUserSnapshot({
          plans: nextPlans,
          memorizationData: nextMemorizationData,
        });
      } catch (fallbackError) {
        setPlansError(fallbackError.message || error.message);
        setMemorizationError(fallbackError.message || error.message);
      }
    } finally {
      if (showLoader) {
        setPlansLoading(false);
        setMemorizationLoading(false);
      }
    }
  };

  const updateUserVersionSettings = async (nextSettings) => {
    if (!isSignedIn || !user?.id) {
      return null;
    }

    return fetchApiJson('/api/settings', {
      method: 'POST',
      body: JSON.stringify({
        chVersion: nextSettings.chineseVersion,
        enVersion: nextSettings.englishVersion,
      }),
    });
  };

  const handleVersionSettingsChange = (partialSettings) => {
    const nextSettings = {
      chineseVersion: normalizeChineseVersion(
        partialSettings.chineseVersion ?? versionDraft.chineseVersion,
      ),
      englishVersion: normalizeEnglishVersion(
        partialSettings.englishVersion ?? versionDraft.englishVersion,
      ),
    };

    setVersionDraft(nextSettings);
    setVersionSettingsMessage('');
  };

  const handleSaveVersionSettings = async () => {
    const nextSettings = {
      chineseVersion: normalizeChineseVersion(versionDraft.chineseVersion),
      englishVersion: normalizeEnglishVersion(versionDraft.englishVersion),
    };

    setSettings(nextSettings);
    setVersionSettingsMessage('');

    if (!isSignedIn || !user?.id) {
      return;
    }

    try {
      setIsSavingVersionSettings(true);
      await updateUserVersionSettings(nextSettings);
      setVersionSettingsMessage('版本设置已保存');
    } catch (_error) {
      // Keep UI responsive even when network/database fails.
      setVersionSettingsMessage('版本已生效，数据库同步稍后重试');
    } finally {
      setIsSavingVersionSettings(false);
    }
  };

  const syncPendingOperationsToServer = async ({ keepalive = false } = {}) => {
    if (!user?.id) return false;

    const pendingRecords = await getPendingOperations(user.id);
    if (pendingRecords.length === 0) {
      return false;
    }

    await fetchApiJson('/api/sync', {
      method: 'POST',
      body: JSON.stringify({
        operations: pendingRecords.map((record) => record.operation),
      }),
      keepalive,
    });

    await clearPendingOperations(pendingRecords.map((record) => record.id));
    return true;
  };

  const schedulePendingSync = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      void syncPendingOperationsToServer().catch(() => {});
    }, SYNC_DEBOUNCE_MS);
  };

  const queuePendingOperation = async (operation, { immediate = false } = {}) => {
    if (!user?.id) return;

    await addPendingOperation(user.id, operation);

    if (immediate) {
      await syncPendingOperationsToServer();
      return;
    }

    schedulePendingSync();
  };

  const handleManualMemorizationSync = async () => {
    if (!isSignedIn || !user?.id || manualSyncing) return;

    setManualSyncing(true);
    if (syncOverlayTimeoutRef.current) {
      clearTimeout(syncOverlayTimeoutRef.current);
      syncOverlayTimeoutRef.current = null;
    }
    setSyncOverlay({ visible: true, text: '数据更新中' });
    setMemorizationError('');

    try {
      const staticData = await getStaticDataSnapshot({ requireFrequent: true });
      const pendingRecords = await getPendingOperations(user.id);

      if (pendingRecords.length > 0) {
        try {
          await syncPendingOperationsToServer();
        } catch (error) {
          throw new Error(`推送本地背诵进度失败：${error.message || '未知错误'}`);
        }
      }

      let remoteMemorizationResult;

      try {
        remoteMemorizationResult = await fetchApiJson('/api/memorization');
      } catch (error) {
        throw new Error(`读取云端背诵数据失败：${error.message || '未知错误'}`);
      }

      const remoteMemorizationData = {
        activeVerses: (remoteMemorizationResult.activeVerses || []).map((item) => hydrateVerseRecord(item, staticData, settings)),
        masteredVerses: (remoteMemorizationResult.masteredVerses || []).map((item) => hydrateVerseRecord(item, staticData, settings)),
      };

      try {
        setMemorizationData(remoteMemorizationData);
        await persistUserSnapshot({ memorizationData: remoteMemorizationData });
      } catch (error) {
        throw new Error(`刷新本地背诵缓存失败：${error.message || '未知错误'}`);
      }

      setCurrentVerseIndex(0);
      setSyncOverlay({
        visible: true,
        text: pendingRecords.length > 0 ? '同步完成：云端与本地已更新' : '同步完成：本地已更新为云端数据',
      });
      syncOverlayTimeoutRef.current = window.setTimeout(() => {
        setSyncOverlay({ visible: false, text: '' });
      }, 1000);
    } catch (error) {
      setMemorizationError(`同步失败：${error.message || '未知错误'}`);
      setSyncOverlay({ visible: true, text: `同步失败：${error.message || '未知错误'}` });
      syncOverlayTimeoutRef.current = window.setTimeout(() => {
        setSyncOverlay({ visible: false, text: '' });
      }, 1000);
    } finally {
      setManualSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setUsernameInput('');
      setSavedUsername('');
      setAvatarPreview('');
      setSelectedAvatarFile(null);
      setProfileError('');
      setProfileSuccess('');
      return;
    }

    const defaultUsername = dbUserProfile?.username || user.firstName || getDefaultDisplayName(primaryEmail);
    setUsernameInput(defaultUsername);
    setSavedUsername(defaultUsername);
    setAvatarPreview('');
    setSelectedAvatarFile(null);
  }, [dbUserProfile?.username, user?.id, user?.firstName, user?.imageUrl, primaryEmail]);

  useEffect(() => {
    cacheSnapshotRef.current = {
      plans,
      planDetails: planDetailsCacheRef.current,
      memorizationData,
    };
  }, [plans, memorizationData]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    void loadLeaderboard();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'my-feedback' || !isSignedIn) return;
    void loadMyFeedback();
  }, [activeTab, isSignedIn]);

  useEffect(() => {
    if (activeTab === 'study' && !isSignedIn) {
      openAuthPage('sign-in');
    }
  }, [activeTab, isSignedIn]);

  useEffect(() => {
    if (authMode !== 'sign-up' || authStep !== 'verify') {
      authAutoSubmitRef.current = false;
      return;
    }

    if (authCode.length === 6 && !authLoading && !authAutoSubmitRef.current) {
      authAutoSubmitRef.current = true;
      void handleAuthSubmit();
      return;
    }

    if (authCode.length < 6) {
      authAutoSubmitRef.current = false;
    }
  }, [authCode, authLoading, authMode, authStep]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    void ensureStaticJsonCached('frequent', { force: true }).catch(() => {});
    void ensureStaticJsonCached('combined').catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn || !staticDataRef.current.frequent) {
      return;
    }

    const nextPlanDetails = Object.fromEntries(
      Object.entries(planDetailsCacheRef.current || {}).map(([planId, detail]) => [
        planId,
        hydratePlanDetail(detail, staticDataRef.current, settings),
      ]),
    );
    const nextMemorizationData = {
      activeVerses: (memorizationData.activeVerses || []).map((item) => hydrateVerseRecord(item, staticDataRef.current, settings)),
      masteredVerses: (memorizationData.masteredVerses || []).map((item) => hydrateVerseRecord(item, staticDataRef.current, settings)),
    };

    planDetailsCacheRef.current = nextPlanDetails;
    setMemorizationData(nextMemorizationData);

    if (selectedPlanId && nextPlanDetails[selectedPlanId]) {
      setSelectedPlan(nextPlanDetails[selectedPlanId].plan);
      setSelectedPlanVerses(nextPlanDetails[selectedPlanId].verses || []);
    }
  }, [settings.chineseVersion, settings.englishVersion, staticDataRevision]);

  useEffect(() => {
    setVersionDraft({
      chineseVersion: normalizeChineseVersion(settings.chineseVersion),
      englishVersion: normalizeEnglishVersion(settings.englishVersion),
    });
  }, [settings.chineseVersion, settings.englishVersion]);

  useEffect(() => {
    if (!showSearchResults) {
      return;
    }

    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      return;
    }

    let cancelled = false;

    void (async () => {
      let combinedData = staticDataRef.current.combined || await getStaticJson('combined');

      if (!combinedData) {
        await ensureStaticJsonCached('combined');
        combinedData = staticDataRef.current.combined || await getStaticJson('combined');
      }

      if (!cancelled && combinedData) {
        setSearchResults(buildBibleSearchResults(combinedData, normalizedQuery, settings));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [settings.chineseVersion, settings.englishVersion, showSearchResults, searchQuery]);

  useEffect(() => {
    if (!isUserLoaded) return;

    if (!isSignedIn) {
      setDbUserProfile(null);
      setMasteredVerses([]);
      setSkippedVerses([]);
      setCurrentVerseIndex(0);
      setSelectedPlan(null);
      setSelectedPlanVerses([]);
      setGuestRainbowVerses([]);
      setMemorizationData({ activeVerses: [], masteredVerses: [] });
      planDetailsCacheRef.current = {};
      cacheSnapshotRef.current = { plans: [], planDetails: {}, memorizationData: { activeVerses: [], masteredVerses: [] } };
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      void loadPublicPlans();
      return;
    }

    void (async () => {
      const cachedData = await getUserCache(user.id);

      if (cachedData) {
        const cachedPlans = (cachedData.plans || []).map((plan) => ({
          ...plan,
          selected_users: normalizeSelectedUsers(plan.selected_users),
        }));

        setPlans(cachedPlans);
        planDetailsCacheRef.current = cachedData.planDetails || {};
        setMemorizationData(cachedData.memorizationData || { activeVerses: [], masteredVerses: [] });
      }

      try {
        await syncPendingOperationsToServer();
      } catch (_error) {
        schedulePendingSync();
      }

      await loadBootstrapData(!cachedData);
    })();
  }, [isUserLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    const handlePageExit = () => {
      void syncPendingOperationsToServer({ keepalive: true }).catch(() => {});
    };

    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);

    return () => {
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
    };
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (syncOverlayTimeoutRef.current) {
        clearTimeout(syncOverlayTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMobileLayout || activeTab !== 'memorization') {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isMobileLayout, activeTab]);

  useEffect(() => {
    if (!isMobileLayout || activeTab !== 'memorization') {
      return;
    }

    const updateWidth = () => {
      const width = mobileViewportRef.current?.clientWidth || window.innerWidth;
      setMobileViewportWidth(width);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, [isMobileLayout, activeTab]);

  useEffect(() => {
    setMobileDragX(0);
    setIsMobileDragAnimating(false);
    pendingMobileFlipRef.current = 0;
  }, [currentVerseIndex, activeTab, viewMode]);

  useEffect(() => {
    if (!isMobileLayout || viewMode !== 'parallel') {
      return;
    }

    setMobileParallelLanguage('chinese');
  }, [isMobileLayout, viewMode, currentVerseIndex]);

  const handleOpenAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileError('');
    setProfileSuccess('');
  };

  const handleCancelProfileEdit = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setUsernameInput(savedUsername);
    setSelectedAvatarFile(null);
    setAvatarPreview('');
    setProfileError('');
    setProfileSuccess('');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const trimmedUsername = usernameInput.trim();
    if (!trimmedUsername) {
      setProfileError('昵称不能为空');
      setProfileSuccess('');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileError('');
      setProfileSuccess('');

      if (trimmedUsername !== (user.firstName || '')) {
        await user.update({ firstName: trimmedUsername });
      }

      if (selectedAvatarFile) {
        await user.setProfileImage({ file: selectedAvatarFile });
      }

      setSavedUsername(trimmedUsername);
      setDbUserProfile((prev) => prev ? { ...prev, username: trimmedUsername } : prev);
      setSelectedAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview('');
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      setProfileSuccess('账号信息已保存');
    } catch (error) {
      setProfileError(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || '保存失败，请稍后重试');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || isDeletingAccount) {
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeleteAccountError('');

      await fetchApiJson('/api/account', {
        method: 'DELETE',
      });

      const pendingRecords = await getPendingOperations(user.id);
      if (pendingRecords.length > 0) {
        await clearPendingOperations(pendingRecords.map((record) => record.id));
      }
      await clearUserCache(user.id);

      resetSignedInUserState();
      setActiveTab('memorization');
      setSidebarOpen(false);
      setAccountMenuOpen(false);

      try {
        await signOut({ redirectUrl: '/' });
      } catch {
        window.location.href = '/';
      }
    } catch (error) {
      setDeleteAccountError(error?.message?.replace(/^HTTP \d+:\s*/, '') || '删除账号失败，请稍后重试');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleOpenAccountPage = () => {
    if (!isSignedIn) {
      setActiveTab('auth');
      setSidebarOpen(false);
      setAccountMenuOpen(false);
      return;
    }
    setActiveTab('userinfo');
    setSidebarOpen(false);
    setAccountMenuOpen(false);
  };

  const getFeedbackStatusLabel = (status) => {
    if (status === 'reviewing') return '处理中';
    if (status === 'resolved') return '已处理';
    if (status === 'closed') return '已关闭';
    return '待处理';
  };

  const getFeedbackStatusStyle = (status) => {
    if (status === 'resolved') {
      return {
        backgroundColor: darkMode ? 'rgba(20,83,45,0.32)' : '#dcfce7',
        color: darkMode ? '#86efac' : '#15803d',
      };
    }

    if (status === 'reviewing') {
      return {
        backgroundColor: darkMode ? 'rgba(30,64,175,0.28)' : '#dbeafe',
        color: darkMode ? '#93c5fd' : '#1d4ed8',
      };
    }

    if (status === 'closed') {
      return {
        backgroundColor: darkMode ? 'rgba(71,85,105,0.28)' : '#e2e8f0',
        color: darkMode ? '#cbd5e1' : '#475569',
      };
    }

    return {
      backgroundColor: darkMode ? 'rgba(120,53,15,0.28)' : '#fef3c7',
      color: darkMode ? '#fcd34d' : '#b45309',
    };
  };

  const formatFeedbackDateTime = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadMyFeedback = async () => {
    if (!isSignedIn) return;

    try {
      setMyFeedbackLoading(true);
      setMyFeedbackError('');
      const result = await fetchApiJson('/api/feedback');
      setMyFeedbackItems(result.feedback || []);
    } catch (error) {
      setMyFeedbackError(error.message || '读取反馈失败');
    } finally {
      setMyFeedbackLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    const trimmedContent = feedbackInput.trim();

    if (!isSignedIn) {
      openAuthPage('sign-in');
      return;
    }

    if (trimmedContent.length < 10) {
      setFeedbackSubmitError('反馈内容至少填写 10 个字');
      setFeedbackSubmitSuccess('');
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      setFeedbackSubmitError('');
      setFeedbackSubmitSuccess('');
      const result = await fetchApiJson('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          content: trimmedContent,
        }),
      });
      setFeedbackInput('');
      setFeedbackSubmitSuccess('反馈已提交');
      setMyFeedbackItems((prev) => [result.feedback, ...prev]);
    } catch (error) {
      setFeedbackSubmitError(error.message?.replace(/^HTTP \d+:\s*/, '') || '提交反馈失败');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getCurrentVerseList = () => {
    if (!isSignedIn) {
      return guestRainbowVerses.filter((verse) =>
        verse &&
        !masteredVerses.some((mv) => mv.id === verse.id) &&
        !skippedVerses.includes(verse.id)
      );
    }

    return currentVerses
      .map(id => allVerses.find(v => v.id === id))
      .filter(v => v && !masteredVerses.some(mv => mv.id === v.id));
  };

  const guestCurrentVerseList = getCurrentVerseList();
  const shouldShowGuestMemorization = isUserLoaded && !isSignedIn;
  const currentVerseList = shouldShowGuestMemorization ? guestCurrentVerseList : memorizationData.activeVerses;
  const currentVerse = currentVerseList[currentVerseIndex];
  const studyVerse = currentVerse || studyFallbackVerse;
  const showMemorizationLoading = !isUserLoaded || (!isSignedIn && (plansLoading || ((!plansError) && (!staticDataRef.current.frequent || guestRainbowVerses.length === 0)))) || (isSignedIn && memorizationLoading);
  const showEmptyMemorizationState = isUserLoaded && isSignedIn && !memorizationLoading && currentVerseList.length === 0;
  const showGuestEmptyState = isUserLoaded && !isSignedIn && !plansLoading && currentVerseList.length === 0;
  const showMobileSearchLanding = isMobileLayout && activeTab === 'search' && !showSearchResults;
  const showMobileSearchResults = isMobileLayout && activeTab === 'search' && showSearchResults;
  const filteredSearchResults = searchResults.filter((verse) => {
    if (searchTestamentFilter === 'all') return true;
    return searchTestamentFilter === 'old'
      ? getTestamentByVerseId(verse.id) === 'old'
      : getTestamentByVerseId(verse.id) === 'new';
  });

  useEffect(() => {
    let cancelled = false;

    if (activeTab !== 'study') {
      return () => {
        cancelled = true;
      };
    }

    if (currentVerse) {
      setStudyFallbackVerse(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const nextVerse = await pickRandomStudyVerse();
        if (!cancelled) {
          setStudyFallbackVerse(nextVerse);
        }
      } catch {
        if (!cancelled) {
          setStudyFallbackVerse(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab, currentVerse, settings.chineseVersion, settings.englishVersion, staticDataRevision]);

  const showMobileMenuOnlyHeader = isMobileLayout && ['study', 'progress', 'settings', 'feedback'].includes(activeTab);
  const showMobileBackOnlyHeader = isMobileLayout && (
    showMobileSearchResults ||
    ['userinfo', 'leaderboard', 'plan-detail', 'auth', 'my-feedback'].includes(activeTab)
  );
  const showMobileCompactHeader = isMobileLayout && !showMobileSearchLanding && !showMobileBackOnlyHeader && !showMobileMenuOnlyHeader;
  const showMobileMemorizationHeader = isMobileLayout && activeTab === 'memorization';
  const hasMultipleCurrentVerses = currentVerseList.length > 1;
  const prevVerse = hasMultipleCurrentVerses
    ? currentVerseList[(currentVerseIndex - 1 + currentVerseList.length) % currentVerseList.length]
    : null;
  const nextVerse = hasMultipleCurrentVerses
    ? currentVerseList[(currentVerseIndex + 1) % currentVerseList.length]
    : null;

  useEffect(() => {
    if (!showMobileMemorizationHeader) {
      return;
    }

    const measureHeader = () => {
      setMobileHeaderHeight(mobileHeaderRef.current?.offsetHeight || 76);
    };

    measureHeader();

    const headerElement = mobileHeaderRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined' && headerElement
      ? new ResizeObserver(() => measureHeader())
      : null;

    resizeObserver?.observe(headerElement);
    window.addEventListener('resize', measureHeader);
    window.visualViewport?.addEventListener('resize', measureHeader);
    window.visualViewport?.addEventListener('scroll', measureHeader);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureHeader);
      window.visualViewport?.removeEventListener('resize', measureHeader);
      window.visualViewport?.removeEventListener('scroll', measureHeader);
    };
  }, [showMobileMemorizationHeader]);

  useEffect(() => {
    if (!isMobileLayout || activeTab !== 'memorization' || !currentVerse) {
      setMobileFontLevel(0);
      return;
    }

    let contentWeight = 0;

    if (viewMode === 'parallel') {
      if (mobileParallelLanguage === 'chinese') {
        contentWeight = String(currentVerse.chinese || '').length;
      } else {
        contentWeight = String(currentVerse.english || '').split(/\s+/).filter(Boolean).length * 4;
      }
    } else if (viewMode === 'fill-in') {
      contentWeight = String(currentVerse.chineseBlank || currentVerse.chinese || '')
        .replace(/[#\s]/g, '')
        .length;
    } else if (viewMode === 'first-letter') {
      contentWeight = String(currentVerse.english || '').split(/\s+/).filter(Boolean).length * 5;
    }

    let nextLevel = 0;
    if (contentWeight > 160) nextLevel = 4;
    else if (contentWeight > 120) nextLevel = 3;
    else if (contentWeight > 85) nextLevel = 2;
    else if (contentWeight > 55) nextLevel = 1;

    setMobileFontLevel(nextLevel);
  }, [isMobileLayout, activeTab, viewMode, currentVerseIndex, mobileParallelLanguage, currentVerse]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const getTabLabel = () => {
    if (activeTab === 'search') {
      return showSearchResults ? '搜索结果' : '搜索';
    }
    if (activeTab === 'study') return '研读';
    if (activeTab === 'plan') return '计划';
    if (activeTab === 'plan-detail') return selectedPlan?.plan_name || '经文列表';
    if (activeTab === 'progress') return '进度';
    if (activeTab === 'settings') return '设置';
    if (activeTab === 'feedback') return '反馈';
    if (activeTab === 'my-feedback') return '我的反馈';
    if (activeTab === 'userinfo') return '账号管理';
    if (activeTab === 'leaderboard') return '排行榜';
    if (activeTab === 'auth') return '登录';
    return '';
  };

  const handleDesktopBack = () => {
    if (activeTab === 'plan-detail') {
      setActiveTab('plan');
      return;
    }

    if (activeTab === 'userinfo') {
      setActiveTab('progress');
      return;
    }

    if (activeTab === 'my-feedback') {
      setActiveTab('feedback');
      return;
    }

    if (activeTab === 'auth') {
      setActiveTab('memorization');
      return;
    }

    setActiveTab('memorization');
  };

  const resetAuthForm = () => {
    setAuthNickname('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthCode('');
    setShowAuthPassword(false);
    setAuthError('');
    setAuthStep('credentials');
    setAuthLoading(false);
    authAutoSubmitRef.current = false;
  };

  const openAuthPage = (mode = 'sign-in') => {
    setAuthMode(mode);
    resetAuthForm();
    setActiveTab('auth');
    setSidebarOpen(false);
    setAccountMenuOpen(false);
  };

  const handleAuthCodeChange = (index, rawValue) => {
    const nextChar = rawValue.replace(/\D/g, '').slice(-1);
    const chars = Array.from({ length: 6 }, (_, idx) => authCode[idx] || '');
    chars[index] = nextChar;
    const nextCode = chars.join('');
    setAuthCode(nextCode);
    setAuthError('');

    if (nextChar && index < 5) {
      authCodeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleAuthCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !authCode[index] && index > 0) {
      authCodeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAuthCodePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    event.preventDefault();
    setAuthCode(pasted);
    setAuthError('');

    const focusIndex = Math.min(pasted.length - 1, 5);
    if (focusIndex >= 0) {
      authCodeInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleAuthSubmit = async () => {
    if (authMode === 'sign-in') {
      if (!authEmail.trim() || !authPassword) {
        setAuthError('请输入邮箱和密码');
        return;
      }

      if (!signIn || !authReady) {
        return;
      }

      try {
        setAuthLoading(true);
        setAuthError('');
        const { error } = await signIn.password({
          emailAddress: authEmail.trim(),
          password: authPassword,
        });

        if (error) {
          throw error;
        }

        if (signIn.status === 'complete') {
          const finalizeResult = await signIn.finalize();
          if (finalizeResult.error) {
            throw finalizeResult.error;
          }
          resetAuthForm();
          setActiveTab('memorization');
        } else if (signIn.status === 'needs_client_trust') {
          await signIn.mfa.sendEmailCode();
          setAuthStep('client-trust');
        } else {
          setAuthError('登录流程未完成，请重试');
        }
      } catch (error) {
        setAuthError(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || '登录失败，请稍后重试');
      } finally {
        setAuthLoading(false);
      }

      return;
    }

    if (authStep === 'credentials') {
      if (!authNickname.trim() || !authEmail.trim() || !authPassword) {
        setAuthError('请输入昵称、邮箱和密码');
        return;
      }

      if (!signUp || !authReady) {
        return;
      }

      try {
        setAuthLoading(true);
        setAuthError('');
        const { error } = await signUp.password({
          firstName: authNickname.trim(),
          emailAddress: authEmail.trim(),
          password: authPassword,
        });

        if (error) {
          throw error;
        }

        await signUp.verifications.sendEmailCode();
        setAuthStep('verify');
      } catch (error) {
        setAuthError(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || '注册失败，请稍后重试');
      } finally {
        setAuthLoading(false);
      }

      return;
    }

    if (!authCode.trim()) {
      setAuthError('请输入邮箱验证码');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      if (authMode === 'sign-in') {
        if (!signIn || !authReady) {
          return;
        }

        const { error } = await signIn.mfa.verifyEmailCode({
          code: authCode.trim(),
        });

        if (error) {
          throw error;
        }

        if (signIn.status === 'complete') {
          const finalizeResult = await signIn.finalize();
          if (finalizeResult.error) {
            throw finalizeResult.error;
          }
          resetAuthForm();
          setActiveTab('memorization');
        }
      } else {
        if (!signUp || !authReady) {
          return;
        }

        const { error } = await signUp.verifications.verifyEmailCode({
          code: authCode.trim(),
        });

        if (error) {
          throw error;
        }

        if (signUp.status === 'complete') {
          const finalizeResult = await signUp.finalize();
          if (finalizeResult.error) {
            throw finalizeResult.error;
          }
          resetAuthForm();
          setActiveTab('memorization');
        }
      }
    } catch (error) {
      setAuthError(error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || '验证码校验失败，请稍后重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const openLeaderboard = () => {
    if (!isSignedIn) {
      openAuthPage('sign-in');
      return;
    }
    setActiveTab('leaderboard');
  };

  const handleSidebarNavigation = (tabId) => {
    if (!isSignedIn && (tabId === 'study' || tabId === 'progress' || tabId === 'settings' || tabId === 'feedback' || tabId === 'my-feedback')) {
      openAuthPage('sign-in');
      return;
    }

    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  const openMobileSearch = () => {
    setSidebarOpen(false);
    setActiveTab('search');
    setShowSearchResults(false);
  };

  const handleMobileBack = () => {
    if (activeTab === 'search') {
      if (showSearchResults) {
        setShowSearchResults(false);
        return;
      }

      setSearchQuery('');
      setActiveTab('memorization');
      return;
    }

    if (activeTab === 'userinfo') {
      setActiveTab('memorization');
      return;
    }

    if (activeTab === 'my-feedback') {
      setActiveTab('feedback');
      return;
    }

    if (activeTab === 'plan-detail') {
      setActiveTab('plan');
      return;
    }

    setActiveTab('memorization');
  };

  const goToNextVerse = () => {
    setCurrentVerseIndex((prev) => (prev + 1) % currentVerseList.length);
  };

  const goToPrevVerse = () => {
    setCurrentVerseIndex((prev) => (prev - 1 + currentVerseList.length) % currentVerseList.length);
  };

  const handleTouchStart = (e) => {
    if (!isMobileLayout || activeTab !== 'memorization' || currentVerseList.length <= 1) {
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDragMetaRef.current = {
      active: true,
      horizontal: false,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
    };
    pendingMobileFlipRef.current = 0;
    setIsMobileDragAnimating(false);
  };

  const handleTouchMove = (e) => {
    if (!isMobileLayout || activeTab !== 'memorization') {
      return;
    }

    const meta = touchDragMetaRef.current;
    if (!meta.active) {
      return;
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - meta.startX;
    const deltaY = touch.clientY - meta.startY;

    if (!meta.horizontal) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) {
        return;
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        touchDragMetaRef.current.active = false;
        return;
      }

      touchDragMetaRef.current.horizontal = true;
    }

    const viewportWidth = mobileViewportWidth || mobileViewportRef.current?.clientWidth || window.innerWidth;
    const clamped = Math.max(Math.min(deltaX, viewportWidth), -viewportWidth);
    setMobileDragX(clamped);
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    if (isMobileLayout) {
      const meta = touchDragMetaRef.current;
      touchDragMetaRef.current.active = false;

      if (!meta.horizontal) {
        return;
      }

      const viewportWidth = mobileViewportWidth || mobileViewportRef.current?.clientWidth || window.innerWidth;
      const threshold = Math.max(56, viewportWidth * 0.2);

      setIsMobileDragAnimating(true);

      if (mobileDragX <= -threshold) {
        pendingMobileFlipRef.current = 1;
        setMobileDragX(-viewportWidth);
        return;
      }

      if (mobileDragX >= threshold) {
        pendingMobileFlipRef.current = -1;
        setMobileDragX(viewportWidth);
        return;
      }

      pendingMobileFlipRef.current = 0;
      setMobileDragX(0);
      return;
    }

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) goToNextVerse();
      else goToPrevVerse();
    }
  };

  const handleMobileVerseTransitionEnd = () => {
    if (!isMobileDragAnimating) {
      return;
    }

    const pending = pendingMobileFlipRef.current;
    pendingMobileFlipRef.current = 0;
    setIsMobileDragAnimating(false);

    if (pending === 1) {
      setCurrentVerseIndex((prev) => (prev + 1) % currentVerseList.length);
    } else if (pending === -1) {
      setCurrentVerseIndex((prev) => (prev - 1 + currentVerseList.length) % currentVerseList.length);
    }

    setMobileDragX(0);
  };

  const handleMobileParallelToggle = () => {
    if (!isMobileLayout || viewMode !== 'parallel') {
      return;
    }

    setMobileParallelLanguage((prev) => (prev === 'chinese' ? 'english' : 'chinese'));
  };

  const getMobileParallelChineseTextClass = () => {
    if (mobileFontLevel >= 4) return 'text-base';
    if (mobileFontLevel === 3) return 'text-lg';
    if (mobileFontLevel === 2) return 'text-xl';
    if (mobileFontLevel === 1) return 'text-2xl';
    return 'text-3xl';
  };

  const getMobileParallelEnglishTextClass = () => {
    if (mobileFontLevel >= 4) return 'text-lg';
    if (mobileFontLevel === 3) return 'text-xl';
    if (mobileFontLevel === 2) return 'text-2xl';
    if (mobileFontLevel === 1) return 'text-3xl';
    return 'text-4xl';
  };

  const renderMobileVersePane = (verseItem, pageLabel, isCurrent = false) => (
    <div className="absolute inset-0 flex flex-col">
      <div className="text-center mb-2 px-6">
        <h2 className="text-xl font-bold text-primary mb-1" style={{ fontFamily: TITLE_FONT_FAMILY }}>
          {verseItem?.referenceCN}
        </h2>
        <p className="text-xs text-gray-500" style={{ fontFamily: TITLE_FONT_FAMILY }}>
          {verseItem?.reference}
        </p>
      </div>

      <div className="text-center mb-2 px-6">
        <span className="inline-block px-4 py-1 rounded-full text-[11px] text-gray-700 dark:text-gray-200" style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}>
          {pageLabel}
        </span>
      </div>

      <div
        ref={isCurrent ? verseContentRef : undefined}
        className="flex-1 flex flex-col justify-center space-y-6 px-6"
      >
        {viewMode === 'parallel' && (
          isCurrent ? (
            <button
              type="button"
              onClick={handleMobileParallelToggle}
              className="text-center px-2 py-1"
            >
              {mobileParallelLanguage === 'chinese' ? (
                <p className={`${getMobileParallelChineseTextClass()} leading-relaxed font-medium`} style={{ fontFamily: TITLE_FONT_FAMILY }}>
                  {verseItem?.chinese}
                </p>
              ) : (
                <p className={`${getMobileParallelEnglishTextClass()} leading-relaxed`} style={{ fontFamily: TITLE_FONT_FAMILY, color: darkMode ? '#e5e7eb' : '#4b5563' }}>
                  {verseItem?.english}
                </p>
              )}
              <p className="mt-3 text-xs text-gray-400">点击切换中/英</p>
            </button>
          ) : (
            <div className="text-center px-2 py-1">
              {mobileParallelLanguage === 'chinese' ? (
                <p className={`${getMobileParallelChineseTextClass()} leading-relaxed font-medium`} style={{ fontFamily: TITLE_FONT_FAMILY }}>
                  {verseItem?.chinese}
                </p>
              ) : (
                <p className={`${getMobileParallelEnglishTextClass()} leading-relaxed`} style={{ fontFamily: TITLE_FONT_FAMILY, color: darkMode ? '#e5e7eb' : '#4b5563' }}>
                  {verseItem?.english}
                </p>
              )}
            </div>
          )
        )}

        {viewMode === 'first-letter' && verseItem && (
          <FirstLetterMode verse={verseItem} darkMode={darkMode} mobileFontLevel={mobileFontLevel} />
        )}

        {viewMode === 'fill-in' && verseItem && (
          <FillInMode verse={verseItem} darkMode={darkMode} mobileFontLevel={mobileFontLevel} />
        )}
      </div>
    </div>
  );

  const handleMastered = () => {
    if (!currentVerse) return;

    if (isSignedIn) {
      handleReview('mastered');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    setMasteredVerses([...masteredVerses, { id: currentVerse.id, date: today, reviewCount: 1 }]);
    const remainingVerses = currentVerseList.filter(v => v.id !== currentVerse.id);
    if (currentVerseIndex >= remainingVerses.length) {
      setCurrentVerseIndex(0);
    }
  };

  const handleNotMastered = () => {
    if (isSignedIn) {
      handleReview('again');
      return;
    }

    goToNextVerse();
  };

  const handleSkip = () => {
    if (!currentVerse) return;

    if (isSignedIn) {
      handleReview('skip');
      return;
    }

    setSkippedVerses([...skippedVerses, currentVerse.id]);
    const remainingVerses = currentVerseList.filter(v => v.id !== currentVerse.id);
    if (currentVerseIndex >= remainingVerses.length) {
      setCurrentVerseIndex(0);
    }
  };

  const handleSearch = (nextQuery = searchQuery) => {
    const normalizedQuery = nextQuery.trim();
    if (!normalizedQuery) return;

    setSearchQuery(normalizedQuery);
    setShowSearchResults(true);
    setSearchTestamentFilter('all');
    setActiveTab('search');
    setSearchLoading(true);

    void (async () => {
      try {
        let combinedData = await getStaticJson('combined');

        if (!combinedData) {
          setDataDownloadOverlay({ visible: true, text: '圣经数据下载中' });
          await ensureStaticJsonCached('combined');
          combinedData = await getStaticJson('combined');
        }

        setSearchResults(buildBibleSearchResults(combinedData, normalizedQuery, settings));
      } finally {
        setDataDownloadOverlay({ visible: false, text: '' });
        setSearchLoading(false);
      }
    })();
  };

  const handleQuickKeywordSearch = (keyword) => {
    setSearchQuery(keyword);
    handleSearch(keyword);
  };

  const addVerseToList = async (verse) => {
    if (!verse) return;

    if (!isSignedIn) {
      setActiveTab('auth');
      return;
    }

    try {
      setSearchLoading(true);
      const nextMemorizationData = applyAddVerseMutation(memorizationData, verse);
      setMemorizationData(nextMemorizationData);
      setCurrentVerseIndex(0);
      setActiveTab('memorization');
      setShowSearchResults(false);
      setSearchQuery('');
      await persistUserSnapshot({ memorizationData: nextMemorizationData });
      await queuePendingOperation({
        type: 'addVerse',
        payload: {
          verseId: verse.id,
        },
      }, { immediate: true });
      await loadBootstrapData(false);
      const reorderedMemorizationData = moveActiveVerseToFront(cacheSnapshotRef.current.memorizationData, verse.id);
      setMemorizationData(reorderedMemorizationData);
      await persistUserSnapshot({ memorizationData: reorderedMemorizationData });
      cacheSnapshotRef.current = {
        ...cacheSnapshotRef.current,
        memorizationData: reorderedMemorizationData,
      };
      setCurrentVerseIndex(0);
    } catch (error) {
      setMemorizationError(error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleReAddToFlashcards = async (verse) => {
    if (!verse || !isSignedIn) return;

    try {
      const nextMemorizationData = applyAddVerseMutation(memorizationData, verse);
      setMemorizationData(nextMemorizationData);
      await persistUserSnapshot({ memorizationData: nextMemorizationData });
      await queuePendingOperation({
        type: 'addVerse',
        payload: { verseId: verse.id || verse.verseId },
      }, { immediate: true });
      await loadBootstrapData(false);
    } catch (error) {
      setMemorizationError(error.message);
    }
  };

  const handleRemoveFromFlashcards = async (verse) => {
    if (!verse || !isSignedIn) return;

    const confirmed = window.confirm('从闪卡中删除');
    if (!confirmed) return;

    try {
      const verseId = verse.id || verse.verseId;
      const nextMemorizationData = applyRemoveVerseMutation(memorizationData, verseId);
      setMemorizationData(nextMemorizationData);
      await persistUserSnapshot({ memorizationData: nextMemorizationData });
      await queuePendingOperation({
        type: 'removeVerse',
        payload: { verseId },
      }, { immediate: true });
      if ((currentVerse?.id || currentVerse?.verseId) === verseId) {
        setCurrentVerseIndex(0);
      }
      await loadBootstrapData(false);
    } catch (error) {
      setMemorizationError(error.message);
    }
  };

  const selectCollection = (collection) => {
    setCurrentVerses(collection.verses.slice(0, GUEST_VERSES_PER_GROUP));
    setMasteredVerses([]);
    setSkippedVerses([]);
    setCurrentVerseIndex(0);
    setActiveTab('memorization');
  };

  const startNextGroup = () => {
    const remainingIds = allVerses
      .filter(v => !masteredVerses.some(mv => mv.id === v.id))
      .slice(0, GUEST_VERSES_PER_GROUP)
      .map(v => v.id);

    if (remainingIds.length > 0) {
      setCurrentVerses(remainingIds);
      setCurrentVerseIndex(0);
    }
    setShowNextGroupModal(false);
  };

  const handleReview = async (action) => {
    if (!currentVerse || !isSignedIn || isSubmittingReview) return;

    try {
      setIsSubmittingReview(true);
      setMemorizationError('');
      const payload = {
        userVerseId: currentVerse.userVerseId,
        action,
      };

      if (action === 'skip') {
        goToNextVerse();
        return;
      }

      const nextMemorizationData = applyReviewMutation(memorizationData, payload);
      setMemorizationData(nextMemorizationData);
      await persistUserSnapshot({ memorizationData: nextMemorizationData });
      await queuePendingOperation({ type: 'review', payload });

      if (action === 'again') {
        goToNextVerse();
      }
    } catch (error) {
      setMemorizationError(error.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSelectPlan = async () => {
    if (!selectedPlan || isSelectingPlan) return;

    try {
      setIsSelectingPlan(true);
      setSelectedPlanError('');
      const currentUserInfo = {
        id: user?.id,
        username: displayUsername,
        imageUrl: user?.imageUrl || '',
      };
      const nextPlans = plans.map((plan) => plan.id === selectedPlan.id ? {
        ...plan,
        is_selected: 1,
        selected_users: mergeSelectedUsers(plan.selected_users || [], currentUserInfo),
      } : plan);
      const nextSelectedPlan = {
        ...selectedPlan,
        is_selected: 1,
        selected_users: mergeSelectedUsers(selectedPlan.selected_users || [], currentUserInfo),
      };
      const nextPlanDetails = {
        ...planDetailsCacheRef.current,
        [selectedPlan.id]: {
          plan: nextSelectedPlan,
          verses: selectedPlanVerses,
        },
      };
      const nextMemorizationData = applySelectPlanMutation(
        memorizationData,
        selectedPlanVerses,
        clearCurrentPlanSelection,
        selectedPlan.id,
      );

      setPlans(nextPlans);
      setSelectedPlan(nextSelectedPlan);
      setMemorizationData(nextMemorizationData);
      planDetailsCacheRef.current = nextPlanDetails;
      await persistUserSnapshot({
        plans: nextPlans,
        planDetails: nextPlanDetails,
        memorizationData: nextMemorizationData,
      });
      await queuePendingOperation({
        type: 'selectPlan',
        payload: {
          planId: selectedPlan.id,
          clearCurrent: clearCurrentPlanSelection,
        },
      }, { immediate: true });

      setShowSelectPlanModal(false);
      setClearCurrentPlanSelection(false);
      await loadBootstrapData();
      setCurrentVerseIndex(0);
      setActiveTab('memorization');
    } catch (error) {
      setSelectedPlanError(error.message);
    } finally {
      setIsSelectingPlan(false);
    }
  };

  const openSelectPlanModal = (plan) => {
    if (!isSignedIn) {
      setActiveTab('auth');
      return;
    }
    setSelectedPlan(plan);
    setSelectedPlanError('');
    setClearCurrentPlanSelection(false);
    setShowSelectPlanModal(true);
  };

  // Leaderboard pagination
  const totalLeaderboardPages = Math.max(1, Math.ceil(leaderboardData.length / leaderboardPageSize));
  const paginatedLeaderboard = leaderboardData.slice(
    (leaderboardPage - 1) * leaderboardPageSize,
    leaderboardPage * leaderboardPageSize
  );

  const totalMastered = isSignedIn ? memorizationData.masteredVerses.length : masteredVerses.length;
  const pendingVerses = isSignedIn
    ? memorizationData.activeVerses
    : currentVerses
      .map(id => allVerses.find(v => v.id === id))
      .filter(v => v && !masteredVerses.some(mv => mv.id === v.id) && !skippedVerses.includes(v.id));

  useEffect(() => {
    if (currentVerseIndex < currentVerseList.length) return;
    setCurrentVerseIndex(0);
  }, [currentVerseIndex, currentVerseList.length]);



  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-[#0d1117] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      {/* Header */}
      <header
        ref={showMobileMemorizationHeader ? mobileHeaderRef : null}
        className={`${showMobileMemorizationHeader ? 'fixed inset-x-0 top-0 z-50' : 'sticky top-0 z-50'} shadow-sm`}
        style={{
          backgroundColor: darkMode
            ? (showMobileMemorizationHeader ? 'rgba(22,27,34,0.92)' : '#161b22')
            : (showMobileMemorizationHeader ? 'rgba(255,255,255,0.92)' : '#ffffff'),
          backdropFilter: showMobileMemorizationHeader ? 'blur(14px)' : undefined,
          WebkitBackdropFilter: showMobileMemorizationHeader ? 'blur(14px)' : undefined,
        }}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="hidden md:flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2 min-w-0">
              <button onClick={toggleSidebar} className={`p-2 rounded-md ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
                <IconMenu />
              </button>
              <button
                onClick={() => setActiveTab('memorization')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity min-w-0"
              >
                <img
                  src="/bblogolong.png"
                  alt="Bible Bee Logo"
                  className="h-8 md:h-10 object-contain"
                />
                <h1 className="text-xl font-bold" style={{ fontFamily: LOGO_FONT_FAMILY }}></h1>
              </button>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="搜索我要背的经文"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 rounded-full border focus:outline-none focus:border-primary text-base"
                  style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                />
                <button
                  onClick={handleSearch}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <IconSearch />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
              <button
                onClick={openLeaderboard}
                className="group relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#30363d]"
                style={{ color: darkMode ? '#facc15' : '#eab308' }}
              >
                <IconMedal />
                <span
                  className="pointer-events-none absolute left-full top-full z-10 ml-2 mt-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                  style={{
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.82)',
                    color: '#f8fafc',
                  }}
                >
                  查看排行榜
                </span>
              </button>
              <button onClick={toggleDarkMode} className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
                {darkMode ? <IconSun /> : <IconMoon />}
              </button>
              {isUserLoaded && isSignedIn ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen(prev => !prev)}
                    className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/15"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff' }}
                  >
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="用户头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary">
                        <IconUser />
                      </div>
                    )}
                  </button>
                  {accountMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-44 rounded-2xl shadow-xl border py-2 z-50"
                      style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                    >
                      <button
                        type="button"
                        onClick={handleOpenAccountPage}
                        className={`w-full px-4 py-3 text-left text-sm ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-gray-50'}`}
                      >
                        账号管理
                      </button>
                      <button
                        type="button"
                        onClick={() => signOut({ redirectUrl: '/' })}
                        className={`w-full px-4 py-3 text-left text-sm text-red-500 ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-gray-50'}`}
                      >
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuthPage('sign-in')}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  登录
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden">
            {showMobileSearchLanding ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMobileBack}
                  className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                  style={{ color: darkMode ? '#d1d5db' : '#374151' }}
                >
                  <IconChevronLeft />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="搜索我要背的经文"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full rounded-full border px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                    style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  className="text-sm font-medium text-primary"
                >
                  搜索
                </button>
              </div>
            ) : showMobileBackOnlyHeader ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={handleMobileBack}
                  className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                  style={{ color: darkMode ? '#d1d5db' : '#374151' }}
                >
                  <IconChevronLeft />
                </button>
                <div className="w-10" />
              </div>
            ) : showMobileMenuOnlyHeader ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={toggleSidebar} className={`p-2 rounded-md ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
                    <IconMenu />
                  </button>
                  <button
                    onClick={() => setActiveTab('memorization')}
                    className="flex items-center"
                  >
                    <img
                      src="/bblogolong.png"
                      alt="Bible Bee Logo"
                      className="h-7 object-contain"
                    />
                  </button>
                </div>
                <div className="w-10 shrink-0" />
              </div>
            ) : showMobileCompactHeader ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={toggleSidebar} className={`p-2 rounded-md ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
                    <IconMenu />
                  </button>
                  <button
                    onClick={() => setActiveTab('memorization')}
                    className="flex items-center"
                  >
                    <img
                      src="/bblogolong.png"
                      alt="Bible Bee Logo"
                      className="h-7 object-contain"
                    />
                  </button>
                </div>
                <button
                  onClick={openMobileSearch}
                  className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                  style={{ color: darkMode ? '#d1d5db' : '#374151' }}
                >
                  <IconSearch />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out shadow-lg`} style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b" style={{ borderColor: darkMode ? '#30363d' : '#e5e7eb' }}>
              <div className="md:hidden flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    setActiveTab('memorization');
                    setSidebarOpen(false);
                  }}
                  className="flex items-center"
                >
                  <img
                    src="/bblogolong.png"
                    alt="Bible Bee Logo"
                    className="h-8 object-contain"
                  />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      openLeaderboard();
                      setSidebarOpen(false);
                    }}
                    className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                    style={{ color: darkMode ? '#facc15' : '#eab308' }}
                    title="排行榜"
                  >
                    <IconMedal />
                  </button>
                  <button onClick={toggleDarkMode} className={`p-2 rounded-full ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`} style={{ color: darkMode ? '#d1d5db' : '#374151' }}>
                    {darkMode ? <IconSun /> : <IconMoon />}
                  </button>
                </div>
              </div>
              <Show when="signed-in">
                <button
                  type="button"
                  onClick={handleOpenAccountPage}
                  className="flex w-full items-center space-x-2 text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden" style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff' }}>
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="用户头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary">
                        <IconUser />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{displayUsername}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">已背 {totalMastered} 节</p>
                  </div>
                </button>
              </Show>
              <Show when="signed-out">
                <button
                  type="button"
                  onClick={() => {
                    openAuthPage('sign-in');
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center space-x-2 rounded-xl px-2 py-2 text-left transition-colors ${darkMode ? 'hover:bg-[#21262d]' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <IconUser />
                  </div>
                  <div>
                    <h3 className="font-medium">访客</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">登录后同步进度</p>
                  </div>
                </button>
              </Show>
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {[
                  { id: 'memorization', label: '首页-闪卡', icon: IconBookOpen },
                  { id: 'study', label: '研读', icon: IconStudy },
                  { id: 'plan', label: '计划', icon: IconBarChart },
                  { id: 'progress', label: '进度', icon: IconUser },
                  { id: 'feedback', label: '反馈', icon: IconMessageSquare },
                  { id: 'settings', label: '设置', icon: IconSettings },
                ].map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSidebarNavigation(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${activeTab === item.id ? 'bg-blue-50 text-primary dark:bg-blue-900/30' : darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                      style={{ color: activeTab === item.id ? '' : (darkMode ? '#d1d5db' : '#374151') }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {isSignedIn && (
              <div className="md:hidden p-4 border-t space-y-2" style={{ borderColor: darkMode ? '#30363d' : '#e5e7eb' }}>
                <button
                  type="button"
                  onClick={handleOpenAccountPage}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                  style={{ color: darkMode ? '#d1d5db' : '#374151' }}
                >
                  <IconSettings />
                  <span>账号管理</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    signOut({ redirectUrl: '/' });
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-red-500 transition-colors ${darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                >
                  <IconLogOut />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`flex-1 ${isMobileLayout && activeTab === 'memorization' ? 'p-0' : 'p-2 md:p-4'}`}>
          {dataDownloadOverlay.visible && (
            <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-6">
              <div
                className="w-full max-w-md rounded-3xl px-10 py-9 text-center text-xl font-semibold shadow-2xl"
                style={{
                  backgroundColor: 'rgba(10,10,10,0.75)',
                  color: '#f8fafc',
                  border: '1px solid rgba(148,163,184,0.32)',
                }}
              >
                {dataDownloadOverlay.text}
              </div>
            </div>
          )}

          {activeTab !== 'memorization' && (
            <div className="hidden md:flex max-w-3xl mx-auto mb-4 items-center justify-between px-1 py-1">
              <button
                type="button"
                onClick={handleDesktopBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:underline"
              >
                <IconChevronLeft />
                返回
              </button>
              <p className="text-sm text-gray-400 dark:text-gray-400">
                首页 / {getTabLabel()}
              </p>
            </div>
          )}

          {activeTab === 'memorization' && (
            <div className={`${showMobileMemorizationHeader ? 'h-[100dvh]' : 'h-[calc(100dvh-72px)]'} md:h-[calc(100vh-100px)] flex flex-col`}>
              {showEmptyMemorizationState ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold mb-2">当前没有待背诵经文</h3>
                  <p className="text-gray-500 mb-6">去计划页选择一个经文列表开始背诵。</p>
                  <button
                    onClick={() => setActiveTab('plan')}
                    className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-blue-600"
                  >
                    去选择计划
                  </button>
                </div>
              ) : showGuestEmptyState ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <div className="text-5xl mb-4">📖</div>
                  <h3 className="text-2xl font-bold mb-2">访客经文暂未加载完成</h3>
                  <p className={`mb-6 ${plansError ? 'text-red-500' : 'text-gray-500'}`}>
                    {plansError || '请刷新页面后重试。'}
                  </p>
                  <button
                    onClick={() => void loadPublicPlans()}
                    className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-blue-600"
                  >
                    重新加载
                  </button>
                </div>
              ) : (
                <div
                  ref={cardRef}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="flex-1 rounded-none md:rounded-2xl shadow-none md:shadow-lg p-4 md:p-6 flex flex-col relative overflow-hidden"
                  style={{
                    backgroundColor: darkMode ? '#161b22' : '#ffffff',
                    touchAction: isMobileLayout ? 'none' : 'auto',
                    overscrollBehavior: isMobileLayout ? 'none' : 'auto',
                    paddingTop: showMobileMemorizationHeader ? `${mobileHeaderHeight + 8}px` : undefined,
                    paddingBottom: isMobileLayout ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : undefined,
                  }}
                >
                {isSignedIn && (
                  <button
                    type="button"
                    aria-label="同步背诵进度"
                    onClick={() => void handleManualMemorizationSync()}
                    disabled={manualSyncing}
                    className={`group absolute right-3 top-3 md:right-4 md:top-4 z-20 inline-flex items-center justify-center rounded-full p-2 transition-all ${
                      manualSyncing
                        ? 'cursor-wait opacity-60'
                        : darkMode
                          ? 'text-blue-300 bg-white hover:bg-blue-50 hover:text-blue-500 hover:shadow-sm'
                          : 'text-blue-400 bg-white hover:bg-blue-50 hover:text-blue-500 hover:shadow-sm'
                    }`}
                  >
                    <IconSync />
                    {!manualSyncing && (
                      <span
                        className="pointer-events-none absolute top-full left-0 mt-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-100 group-hover:opacity-100 md:left-auto md:right-full md:top-full md:mr-2"
                        style={{
                          backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(15,23,42,0.78)',
                          color: '#f8fafc',
                        }}
                      >
                        同步背诵进度
                      </span>
                    )}
                  </button>
                )}
                {syncOverlay.visible && (
                  <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-6">
                    <div
                      className="w-full max-w-md rounded-3xl px-10 py-9 text-center text-xl font-semibold shadow-2xl"
                      style={{
                        backgroundColor: 'rgba(10,10,10,0.75)',
                        color: '#f8fafc',
                        border: '1px solid rgba(148,163,184,0.32)',
                      }}
                    >
                      {syncOverlay.text}
                    </div>
                  </div>
                )}
                {showMemorizationLoading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">正在加载背诵经文...</div>
                ) : currentVerseList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold mb-2">{shouldShowGuestMemorization ? '恭喜！' : '当前没有待背诵经文'}</h3>
                    <p className="text-gray-500 mb-6">
                      {shouldShowGuestMemorization ? '你已经完成了访客模式的彩虹背诵经文。' : '去计划页选择一个经文列表开始背诵。'}
                    </p>
                    {!shouldShowGuestMemorization ? (
                      <button
                        onClick={() => setActiveTab('plan')}
                        className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-blue-600"
                      >
                        去选择计划
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setMasteredVerses([]);
                            setSkippedVerses([]);
                            setCurrentVerseIndex(0);
                          }}
                          className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-blue-600"
                        >
                          重新开始
                        </button>
                        <button
                          onClick={() => openAuthPage('sign-in')}
                          className="px-6 py-3 rounded-full font-medium border transition-colors"
                          style={{ borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                        >
                          登录同步
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={goToPrevVerse}
                      className="hidden md:block absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full transition-all hover:bg-gray-200 shadow-md z-10"
                      style={{ backgroundColor: darkMode ? 'rgba(33, 38, 45, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}
                    >
                      <IconChevronLeft />
                    </button>

                    <button
                      onClick={goToNextVerse}
                      className="hidden md:block absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full transition-all hover:bg-gray-200 shadow-md z-10"
                      style={{ backgroundColor: darkMode ? 'rgba(33, 38, 45, 0.8)' : 'rgba(255, 255, 255, 0.8)' }}
                    >
                      <IconChevronRight />
                    </button>

                    {isMobileLayout ? (
                      <div className="flex justify-center items-center gap-2 mb-3 md:mb-6">
                        {[
                          { key: 'parallel', label: '对照' },
                          { key: 'fill-in', label: '挖空' },
                          { key: 'first-letter', label: '首字' },
                        ].map((mode) => (
                          <button
                            key={mode.key}
                            onClick={() => setViewMode(mode.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              viewMode === mode.key
                                ? 'bg-primary text-white'
                                : darkMode
                                  ? 'text-gray-200 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d]'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-center space-x-4 mb-6">
                        {[
                          { key: 'parallel', icon: IconParallel, label: '对照' },
                          { key: 'fill-in', icon: IconFillIn, label: '挖空' },
                          { key: 'first-letter', icon: IconFirstLetter, label: '首字' }
                        ].map(mode => (
                          <button
                            key={mode.key}
                            onClick={() => setViewMode(mode.key)}
                            className={`flex flex-col items-center p-3 rounded-xl transition-all ${viewMode === mode.key ? 'bg-primary text-white' : darkMode ? 'hover:bg-[#30363d]' : 'hover:bg-gray-100'}`}
                            style={{ color: viewMode === mode.key ? '' : (darkMode ? '#d1d5db' : '#374151') }}
                          >
                            <mode.icon />
                            <span className="text-xs mt-1">{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isMobileLayout && (
                      <>
                        <div className="text-center mb-2 md:mb-4">
                          <h2 className="text-xl md:text-2xl font-bold text-primary mb-1" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                            {currentVerse?.referenceCN}
                          </h2>
                          <p className="text-xs md:text-sm text-gray-500" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                            {currentVerse?.reference}
                          </p>
                        </div>

                        <div className="text-center mb-2 md:mb-4">
                          <span className="inline-block px-4 py-1 rounded-full text-[11px] md:text-xs text-gray-700 dark:text-gray-200" style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}>
                            {currentVerseIndex + 1} / {currentVerseList.length}
                          </span>
                        </div>
                      </>
                    )}

                    {isMobileLayout ? (
                      <div ref={mobileViewportRef} className="relative flex-1 overflow-hidden">
                        <div
                          onTransitionEnd={handleMobileVerseTransitionEnd}
                          className="absolute inset-0"
                          style={{
                            transform: `translateX(${mobileDragX}px)`,
                            transition: isMobileDragAnimating ? 'transform 190ms ease-out' : 'none',
                          }}
                        >
                          {renderMobileVersePane(currentVerse, `${currentVerseIndex + 1} / ${currentVerseList.length}`, true)}
                        </div>

                        {mobileDragX > 0 && prevVerse && (
                          <div
                            className="absolute inset-0"
                            style={{ transform: `translateX(${mobileDragX - (mobileViewportWidth || window.innerWidth)}px)` }}
                          >
                            {renderMobileVersePane(prevVerse, `${(currentVerseIndex - 1 + currentVerseList.length) % currentVerseList.length + 1} / ${currentVerseList.length}`)}
                          </div>
                        )}

                        {mobileDragX < 0 && nextVerse && (
                          <div
                            className="absolute inset-0"
                            style={{ transform: `translateX(${mobileDragX + (mobileViewportWidth || window.innerWidth)}px)` }}
                          >
                            {renderMobileVersePane(nextVerse, `${(currentVerseIndex + 1) % currentVerseList.length + 1} / ${currentVerseList.length}`)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        ref={verseContentRef}
                        className="flex-1 flex flex-col justify-center space-y-6 px-6 md:px-20 overflow-y-auto"
                      >
                        {viewMode === 'parallel' && (
                          <>
                            <div className="text-center">
                              <p className="text-xl md:text-2xl leading-relaxed font-medium" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                                {currentVerse?.chinese}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg md:text-xl leading-relaxed" style={{ fontFamily: TITLE_FONT_FAMILY, color: darkMode ? '#e5e7eb' : '#4b5563' }}>
                                {currentVerse?.english}
                              </p>
                            </div>
                          </>
                        )}

                        {viewMode === 'first-letter' && currentVerse && (
                          <FirstLetterMode verse={currentVerse} darkMode={darkMode} />
                        )}

                        {viewMode === 'fill-in' && currentVerse && (
                          <FillInMode verse={currentVerse} darkMode={darkMode} />
                        )}
                      </div>
                    )}

                    {!isMobileLayout && (
                    <div className="text-center mt-4">
                      <button
                        onClick={() => {
                          if (!isSignedIn) {
                            openAuthPage('sign-in');
                            return;
                          }
                          setActiveTab('study');
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        深度研读
                      </button>
                    </div>
                    )}

                    <div className="flex justify-center items-center mt-6">
                      <button
                        onClick={handleMastered}
                        disabled={isSubmittingReview}
                        className="px-10 py-3 rounded-full bg-green-500 text-white hover:bg-green-600 font-medium transition-all shadow-lg"
                      >
                        会背了
                      </button>
                    </div>
                    {memorizationError && (
                      <p className="text-center text-sm text-red-500 mt-4">{memorizationError}</p>
                    )}
                  </>
                )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              {showMobileSearchLanding ? (
                <div className="max-w-3xl mx-auto px-4 pt-6">
                  <div className="rounded-3xl border px-5 py-6" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">常用搜索关键词</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {MOBILE_SEARCH_KEYWORDS.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleQuickKeywordSearch(keyword)}
                          className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                          style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff', color: darkMode ? '#e5e7eb' : '#2563eb' }}
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-w-3xl mx-auto px-4 md:px-0">
                    <p className="text-gray-500 text-sm">
                      搜索“{searchQuery}”，找到 {filteredSearchResults.length} 节经文
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      {[
                        { key: 'all', label: '全部' },
                        { key: 'new', label: '新约' },
                        { key: 'old', label: '旧约' },
                      ].map((filterItem) => (
                        <button
                          key={filterItem.key}
                          type="button"
                          onClick={() => setSearchTestamentFilter(filterItem.key)}
                          className={`px-3 py-1.5 rounded-full text-xs md:text-sm transition-colors ${
                            searchTestamentFilter === filterItem.key
                              ? 'bg-primary text-white'
                              : darkMode
                                ? 'bg-[#21262d] text-gray-300 hover:bg-[#30363d]'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {filterItem.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 max-w-3xl mx-auto">
                    {searchLoading ? (
                      <p className="text-gray-500 text-center py-10">正在搜索经文...</p>
                    ) : filteredSearchResults.length === 0 ? (
                      <p className="text-gray-500 text-center py-10">未找到匹配的经文</p>
                    ) : (
                      filteredSearchResults.map(verse => (
                        <div key={verse.id} className="rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-primary">{verse.referenceCN}</h3>
                              <p className="text-sm text-gray-500 mt-1">{verse.reference}</p>
                            </div>
                            <button
                              onClick={() => addVerseToList(verse)}
                              className="px-5 py-2 bg-primary text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                            >
                              加入我的背诵
                            </button>
                          </div>
                          <div className="space-y-3">
                            <p className="text-lg leading-relaxed" style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>
                              {renderHighlightedText(verse.chinese, searchQuery)}
                            </p>
                            <p className="italic" style={{ color: darkMode ? '#9ca3af' : '#4b5563' }}>
                              {renderHighlightedText(verse.english, searchQuery)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="max-w-xl mx-auto pt-6">
              <div
                className="rounded-[2rem] border px-6 py-8 md:px-8 md:py-10 shadow-sm"
                style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                    {authMode === 'sign-in'
                      ? authStep === 'client-trust' ? '验证登录' : '欢迎回来'
                      : authStep === 'verify' ? '邮箱验证' : '创建账号'}
                  </p>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {authMode === 'sign-in'
                      ? authStep === 'client-trust'
                        ? '请输入发送到邮箱的验证码完成登录'
                        : '使用邮箱和密码登录 BibleBee'
                      : authStep === 'verify'
                        ? '请输入发送到邮箱的验证码完成注册'
                        : '使用昵称、邮箱和密码创建账号'}
                  </p>
                </div>

                <div className="mt-6 inline-flex rounded-2xl p-1" style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}>
                  <button
                    type="button"
                    onClick={() => openAuthPage('sign-in')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${authMode === 'sign-in' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthPage('sign-up')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${authMode === 'sign-up' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                  >
                    注册
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {authMode === 'sign-up' && authStep === 'credentials' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">昵称</label>
                      <input
                        type="text"
                        value={authNickname}
                        onChange={(e) => {
                          setAuthNickname(e.target.value);
                          setAuthError('');
                        }}
                        className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-primary"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                        placeholder="输入昵称"
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        昵称可使用中文、空格、大小写
                      </p>
                    </div>
                  )}

                  {(authMode === 'sign-up' && authStep === 'verify') || (authMode === 'sign-in' && authStep === 'client-trust') ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">验证码</label>
                      <div className="flex items-center justify-between gap-2 md:gap-3">
                        {Array.from({ length: 6 }, (_, index) => (
                          <input
                            key={index}
                            ref={(element) => {
                              authCodeInputRefs.current[index] = element;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={authCode[index] || ''}
                            onChange={(e) => handleAuthCodeChange(index, e.target.value)}
                            onKeyDown={(e) => handleAuthCodeKeyDown(index, e)}
                            onPaste={handleAuthCodePaste}
                            className="h-12 w-12 md:h-14 md:w-14 rounded-xl border text-center text-lg font-semibold focus:outline-none focus:border-primary"
                            style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        输入 6 位验证码后将自动完成{authMode === 'sign-up' ? '注册' : '登录'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">邮箱</label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => {
                            setAuthEmail(e.target.value);
                            setAuthError('');
                          }}
                          className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-primary"
                          style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                          placeholder="输入邮箱"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">密码</label>
                        <div className="relative">
                          <input
                            type={showAuthPassword ? 'text' : 'password'}
                            value={authPassword}
                            onChange={(e) => {
                              setAuthPassword(e.target.value);
                              setAuthError('');
                            }}
                            className="w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:border-primary"
                            style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                            placeholder="输入密码"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAuthPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                            aria-label={showAuthPassword ? '隐藏密码' : '显示密码'}
                          >
                            {showAuthPassword ? <IconEyeOff /> : <IconEye />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {authError && (
                  <p className="mt-4 text-sm text-red-500">{authError}</p>
                )}
                {!authReady && (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">认证服务加载中...</p>
                )}

                {!((authMode === 'sign-up' && authStep === 'verify')) && (
                  <button
                    type="button"
                    onClick={() => void handleAuthSubmit()}
                    disabled={authLoading || !authReady}
                    className="mt-6 w-full px-8 py-3 rounded-full bg-primary text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                  >
                    {authLoading
                      ? '处理中...'
                      : authMode === 'sign-in'
                        ? authStep === 'client-trust' ? '完成登录' : '登录'
                        : '继续'}
                  </button>
                )}
                {!authReady && (
                  <button
                    type="button"
                    onClick={() => authMode === 'sign-in' ? openSignIn() : openSignUp()}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    如果等待较久，尝试打开官方{authMode === 'sign-in' ? '登录' : '注册'}窗口
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'study' && (
            <div className="space-y-6 pt-4 md:pt-6 max-w-3xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <p className="text-sm text-gray-400 mt-0">敬畏耶和华是智慧的开端，认识至圣者便是聪明。</p>
                </div>
              </div>

              <div
                className="rounded-[1.5rem] border px-5 py-4 md:px-6 md:py-5"
                style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-300 leading-7">
                  研读功能设计中，请告诉我们你对这个功能的
                  <button
                    type="button"
                    onClick={() => setActiveTab('feedback')}
                    className="mx-2 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium text-primary transition-colors"
                    style={{
                      backgroundColor: darkMode ? 'rgba(59,130,246,0.12)' : '#eff6ff',
                      borderColor: darkMode ? 'rgba(59,130,246,0.22)' : '#bfdbfe',
                    }}
                  >
                    建议
                  </button>
                  。
                </p>
              </div>

              <div className="w-full rounded-lg shadow-sm p-5 md:p-6 overflow-hidden" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                <h3 className="font-medium mb-4">{studyVerse?.referenceCN} {studyVerse?.reference}</h3>
                <div className="space-y-4">
                  <div style={{ fontFamily: TITLE_FONT_FAMILY }} className="text-lg leading-relaxed break-words flex flex-wrap gap-x-1.5 gap-y-2">
                    {studyVerse?.english?.split(' ').map((word, i) => (
                      <span key={i} className="text-primary cursor-pointer hover:underline break-words">{word}</span>
                    ))}
                  </div>
                  <div style={{ fontFamily: TITLE_FONT_FAMILY }} className="text-lg leading-relaxed break-words">
                    {studyVerse?.chinese}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-6 max-w-3xl mx-auto pt-4 md:pt-6">
              {plansLoading ? (
                <div className="text-center text-gray-500">正在加载计划...</div>
              ) : plansError ? (
                <div className="text-center text-red-500">{plansError}</div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan, index) => (
                    <div
                      key={plan.id}
                      className="rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-[1.02]"
                      style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}
                    >
                      <div className={`h-2 bg-gradient-to-r ${verseCollections[index % verseCollections.length].color}`}></div>
                      <div className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="text-4xl">{verseCollections[index % verseCollections.length].icon}</div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2 gap-3">
                              <h3 className="text-xl font-bold">{plan.plan_name}</h3>
                              <div className="flex items-center gap-2">
                                {plan.is_selected === 1 && (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    已选择
                                  </span>
                                )}
                                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${verseCollections[index % verseCollections.length].color} text-white`}>
                                  {plan.verse_count}节
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-500 dark:text-gray-300 mb-4">{plan.description}</p>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center">
                                {(plan.selected_users || []).length > 0 ? (
                                  <div className="flex items-center">
                                    {(plan.selected_users || []).slice(0, 5).map((selectedUser, avatarIndex) => (
                                      <div
                                        key={selectedUser.id}
                                        className={`group relative w-8 h-8 rounded-full overflow-hidden border-2 ${avatarIndex === 0 ? '' : '-ml-2'}`}
                                        style={{
                                          backgroundColor: darkMode ? '#21262d' : '#f3f4f6',
                                          borderColor: darkMode ? '#161b22' : '#ffffff',
                                        }}
                                      >
                                        {selectedUser.image_url ? (
                                          <>
                                            <img
                                              src={selectedUser.image_url}
                                              alt={selectedUser.username || '用户头像'}
                                              className="w-full h-full object-cover"
                                              onError={(event) => {
                                                event.currentTarget.style.display = 'none';
                                                const fallback = event.currentTarget.nextElementSibling;
                                                if (fallback) {
                                                  fallback.classList.remove('hidden');
                                                  fallback.classList.add('flex');
                                                }
                                              }}
                                            />
                                            <div className="hidden w-full h-full items-center justify-center text-xs font-semibold text-primary">
                                              {(selectedUser.username || 'U').slice(0, 1).toUpperCase()}
                                            </div>
                                          </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-primary">
                                              {(selectedUser.username || 'U').slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                        <span
                                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                                          style={{
                                            backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.82)',
                                            color: '#f8fafc',
                                          }}
                                        >
                                          {selectedUser.username || '用户'}
                                        </span>
                                      </div>
                                    ))}
                                    {(plan.selected_users || []).length > 5 && (
                                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                        +{plan.selected_users.length - 5}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">暂无用户选择</span>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-3 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => loadPlanDetails(plan.id)}
                                  className="group relative inline-flex h-9 px-1 items-center justify-center text-gray-500 hover:text-primary transition-colors"
                                  aria-label="查看经文列表"
                                >
                                  <IconList />
                                  <span
                                    className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.82)',
                                      color: '#f8fafc',
                                    }}
                                  >
                                    查看经文列表
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openSelectPlanModal(plan)}
                                  className="group relative inline-flex h-9 px-1 items-center justify-center text-gray-500 hover:text-primary transition-colors"
                                  aria-label="全部添加到闪卡"
                                >
                                  <IconStackPlus />
                                  <span
                                    className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.82)',
                                      color: '#f8fafc',
                                    }}
                                  >
                                    全部添加到闪卡
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan-detail' && (
            <div className="space-y-6 max-w-3xl mx-auto pt-4 md:pt-6">
              <button
                type="button"
                onClick={() => setActiveTab('plan')}
                className="text-sm text-primary hover:underline"
              >
                返回计划列表
              </button>

              {selectedPlanLoading ? (
                <div className="text-center text-gray-500">正在加载经文列表...</div>
              ) : selectedPlanError ? (
                <div className="text-center text-red-500">{selectedPlanError}</div>
              ) : selectedPlan && (
                <>
                  {(() => {
                    const displaySelectedUsers = (selectedPlan.selected_users || []).length > 0
                      ? selectedPlan.selected_users
                      : normalizeSelectedUsers(plans.find((plan) => plan.id === selectedPlan.id)?.selected_users);

                    return (
                  <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedPlan.plan_name}</h2>
                        <p className="text-gray-500 dark:text-gray-300 mt-2">{selectedPlan.description}</p>
                        <div className="mt-4 flex items-center">
                          {displaySelectedUsers.length > 0 ? (
                            <>
                              {displaySelectedUsers.slice(0, 8).map((selectedUser, avatarIndex) => (
                                <div
                                  key={selectedUser.id}
                                  className={`group relative w-8 h-8 rounded-full overflow-hidden border-2 ${avatarIndex === 0 ? '' : '-ml-2'}`}
                                  style={{
                                    backgroundColor: darkMode ? '#21262d' : '#f3f4f6',
                                    borderColor: darkMode ? '#161b22' : '#ffffff',
                                  }}
                                >
                                  {selectedUser.image_url ? (
                                    <>
                                      <img
                                        src={selectedUser.image_url}
                                        alt={selectedUser.username || '用户头像'}
                                        className="w-full h-full object-cover"
                                        onError={(event) => {
                                          event.currentTarget.style.display = 'none';
                                          const fallback = event.currentTarget.nextElementSibling;
                                          if (fallback) {
                                            fallback.classList.remove('hidden');
                                            fallback.classList.add('flex');
                                          }
                                        }}
                                      />
                                      <div className="hidden w-full h-full items-center justify-center text-xs font-semibold text-primary">
                                        {(selectedUser.username || 'U').slice(0, 1).toUpperCase()}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-primary">
                                      {(selectedUser.username || 'U').slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <span
                                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.82)',
                                      color: '#f8fafc',
                                    }}
                                  >
                                    {selectedUser.username || '用户'}
                                  </span>
                                </div>
                              ))}
                              {displaySelectedUsers.length > 8 && (
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                  +{displaySelectedUsers.length - 8}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">暂无用户加入</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openSelectPlanModal(selectedPlan)}
                        className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-blue-600 transition-colors"
                      >
                        添加到闪卡
                      </button>
                    </div>
                  </div>
                    );
                  })()}

                  <div className="space-y-3">
                    {selectedPlanVerses.map((verse) => (
                      <div
                        key={verse.id}
                        className="rounded-2xl shadow-sm p-5"
                        style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}
                      >
                        <p className="text-sm text-gray-400 mb-2">
                          {verse.orderIndex}. {verse.referenceCN}
                          <span className="ml-1">({verse.reference})</span>
                        </p>
                        <p className="text-base leading-7 mb-2">{verse.chinese}</p>
                        <p className="text-sm italic text-gray-500">{verse.english}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'userinfo' && (
            <div className="space-y-6 max-w-2xl mx-auto pt-4">
              <Show when="signed-in">
                <div className="rounded-2xl shadow-sm p-6 md:p-8" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="relative w-20 h-20 md:w-24 md:h-24">
                        <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-primary/15" style={{ backgroundColor: darkMode ? '#21262d' : '#eff6ff' }}>
                          {displayedAvatar ? (
                            <img src={displayedAvatar} alt="用户头像" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary">
                              <IconUser />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAvatarPicker}
                          className="absolute -right-1 bottom-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border"
                          style={{
                            backgroundColor: darkMode ? '#d1d5db' : '#e5e7eb',
                            borderColor: darkMode ? '#9ca3af' : '#d1d5db',
                            color: '#374151'
                          }}
                          aria-label="更新头像"
                        >
                          <IconCamera />
                        </button>
                      </div>
                      <div>
                        <p className="text-2xl md:text-3xl font-bold" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                          {displayUsername}
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:block" />
                  </div>

                  <div className="hidden">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 mt-8">
                    <div>
                      <label className="block text-sm font-medium mb-2">昵称</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => {
                          setUsernameInput(e.target.value);
                          setProfileError('');
                          setProfileSuccess('');
                        }}
                        className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-primary"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">邮箱</label>
                      <input
                        type="text"
                        value={primaryEmail}
                        disabled
                        className="w-full px-4 py-3 border rounded-xl opacity-70 cursor-not-allowed"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#f9fafb', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                      />
                    </div>
                  </div>

                  {(profileError || profileSuccess) && (
                    <div className={`mt-5 text-sm ${profileError ? 'text-red-500' : 'text-green-600'}`}>
                      {profileError || profileSuccess}
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteAccountError('');
                        setShowDeleteAccountModal(true);
                      }}
                      className="px-5 py-3 rounded-xl border font-medium transition-colors sm:mr-auto"
                      style={{
                        borderColor: darkMode ? 'rgba(239,68,68,0.28)' : '#fecaca',
                        backgroundColor: darkMode ? 'rgba(127,29,29,0.16)' : '#fff7f7',
                        color: darkMode ? '#fca5a5' : '#b91c1c',
                      }}
                    >
                      删除账号
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelProfileEdit}
                      className="px-5 py-3 rounded-xl border font-medium transition-colors"
                      style={{ borderColor: darkMode ? '#30363d' : '#d1d5db', backgroundColor: darkMode ? '#21262d' : '#ffffff' }}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-5 py-3 rounded-xl bg-primary text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                    >
                      {isSavingProfile ? '保存中...' : '保存'}
                    </button>
                  </div>

                </div>
              </Show>
              <Show when="signed-out">
                <div className="rounded-2xl shadow-sm p-8 text-center" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <IconUser />
                  </div>
                  <h3 className="text-xl font-bold mb-2">访客模式</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">登录后可同步您的背诵进度到云端</p>
                  <button 
                    onClick={() => openAuthPage('sign-up')}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    登录 / 注册
                  </button>
                </div>
              </Show>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6 max-w-3xl mx-auto pt-4">
              <div
                className="overflow-hidden rounded-[2rem] shadow-xl"
                style={{
                  background: darkMode
                    ? 'linear-gradient(135deg, #141922 0%, #1a2432 48%, #0e1620 100%)'
                    : 'linear-gradient(135deg, #fefbf2 0%, #f6f2ff 42%, #eef7ff 100%)',
                }}
              >
                <div className="px-6 py-7 md:px-8 md:py-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <button
                      type="button"
                      onClick={handleOpenAccountPage}
                      className="flex items-center gap-4 text-left"
                    >
                      <div
                        className="h-14 w-14 md:h-16 md:w-16 rounded-3xl overflow-hidden ring-4 shrink-0"
                        style={{
                          backgroundColor: darkMode ? '#21262d' : '#ffffff',
                          ringColor: darkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)',
                        }}
                      >
                        {user?.imageUrl ? (
                          <img src={user.imageUrl} alt="用户头像" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary">
                            <IconUser />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.26em] text-primary/80 mb-2">Progress</p>
                        <h2 className="text-2xl md:text-4xl font-bold leading-tight" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                          <Show when="signed-in">{displayUsername}</Show>
                          <Show when="signed-out">访客模式</Show>
                        </h2>
                        <p className="mt-2 max-w-sm text-sm md:text-base text-gray-500 dark:text-gray-300 hidden md:block">
                          <Show when="signed-in">我将你的话藏在心里！</Show>
                          <Show when="signed-out">登录后可以同步你的背诵进度与个人数据。</Show>
                        </p>
                      </div>
                    </button>

                    <div className="pl-[4.5rem] md:pl-0 text-left md:text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-300">已掌握经文</p>
                      <p className="text-4xl md:text-6xl font-bold text-primary leading-none mt-1 md:mt-2">{totalMastered}</p>
                      <p className="mt-1 md:mt-2 text-sm text-gray-500 dark:text-gray-300">节经文</p>
                      <div className="mt-3 flex md:justify-end">
                        <button
                          type="button"
                          onClick={openLeaderboard}
                          className="group relative inline-flex items-center justify-center rounded-full p-2 transition-colors"
                          style={{
                            backgroundColor: darkMode ? 'rgba(250,204,21,0.12)' : 'rgba(250,204,21,0.14)',
                            color: darkMode ? '#facc15' : '#ca8a04',
                          }}
                          aria-label="排行榜"
                        >
                          <IconMedal />
                          <span
                            className="pointer-events-none absolute right-full top-1/2 z-10 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                            style={{
                              backgroundColor: darkMode ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.82)',
                              color: '#f8fafc',
                            }}
                          >
                            查看排行榜
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs italic"
                      style={{
                        backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
                        color: darkMode ? '#9ca3af' : '#9ca3af',
                        border: `1px solid ${darkMode ? '#30363d' : '#e5e7eb'}`,
                      }}
                    >
                      <span>待背诵</span>
                      <span className="mx-1 font-bold not-italic text-primary">{pendingVerses.length}</span>
                      <span>节经文</span>
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[1.75rem] border px-6 py-6 md:px-8 shadow-sm"
                style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Library</p>
                    <h3 className="mt-2 text-2xl font-bold">我的经文库</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 hidden md:block">但你所学习的，所确信的，要存在心里……并且知道你是从小明白圣经。</p>
                  </div>
                  <div className="inline-flex rounded-2xl p-1" style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}>
                    <button
                      type="button"
                      onClick={() => setProgressView('mastered')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${progressView === 'mastered' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                    >
                      已会背
                    </button>
                    <button
                      type="button"
                      onClick={() => setProgressView('pending')}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${progressView === 'pending' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 dark:text-gray-300'}`}
                    >
                      待背诵
                    </button>
                  </div>
                </div>

                {progressView === 'mastered' ? (
                  <>
                    {(isSignedIn ? memorizationData.masteredVerses.length : masteredVerses.length) === 0 ? (
                      <div className="rounded-2xl px-6 py-10 text-center text-gray-500" style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc' }}>
                        还没有会背的经文
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(isSignedIn ? memorizationData.masteredVerses : masteredVerses).map(mv => {
                          const verse = isSignedIn ? mv : allVerses.find(v => v.id === mv.id);
                          return (
                            <div
                              key={isSignedIn ? mv.userVerseId : mv.id}
                              className="rounded-[1.5rem] border p-5"
                              style={{ backgroundColor: darkMode ? '#21262d' : '#fbfdff', borderColor: darkMode ? '#30363d' : '#edf2f7' }}
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-primary text-lg">{verse?.referenceCN}</p>
                                    <span
                                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                                      style={{
                                        backgroundColor: darkMode ? 'rgba(22,163,74,0.22)' : '#dcfce7',
                                        color: darkMode ? '#86efac' : '#15803d',
                                      }}
                                    >
                                      已掌握
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{verse?.reference}</p>
                                  <p className="text-sm mt-3 leading-7" style={{ color: darkMode ? '#ffffff' : '#4b5563' }}>{verse?.chinese}</p>
                                  <p className="text-sm mt-2 italic leading-7" style={{ color: darkMode ? '#9ca3af' : '#9ca3af' }}>{verse?.english}</p>
                                </div>
                                <div className="shrink-0 text-right flex flex-col items-end justify-between self-stretch">
                                  <div></div>
                                  {isSignedIn && (
                                    <button
                                      type="button"
                                      onClick={() => handleReAddToFlashcards(verse)}
                                      className="group relative mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                                      style={{
                                        backgroundColor: darkMode ? 'rgba(59,130,246,0.12)' : 'rgba(219,234,254,0.7)',
                                        color: darkMode ? '#93c5fd' : '#2563eb',
                                        border: `1px solid ${darkMode ? 'rgba(59,130,246,0.18)' : 'rgba(147,197,253,0.8)'}`,
                                      }}
                                      aria-label="重新加入闪卡"
                                    >
                                      <IconPlus />
                                      <span
                                        className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                                        style={{
                                          backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(15,23,42,0.78)',
                                          color: '#f8fafc',
                                        }}
                                      >
                                        重新加入闪卡
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {pendingVerses.length === 0 ? (
                      <div className="rounded-2xl px-6 py-10 text-center text-gray-500" style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc' }}>
                        没有待背诵的经文
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingVerses.map(verse => (
                          <div
                            key={verse.id}
                            className="rounded-[1.5rem] border p-5"
                            style={{ backgroundColor: darkMode ? '#21262d' : '#fbfdff', borderColor: darkMode ? '#30363d' : '#edf2f7' }}
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-primary text-lg">{verse.referenceCN}</p>
                                  <span
                                    className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(59,130,246,0.18)' : '#dbeafe',
                                      color: darkMode ? '#93c5fd' : '#1d4ed8',
                                    }}
                                  >
                                    学习中
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{verse.reference}</p>
                                <p className="text-sm mt-3 leading-7" style={{ color: darkMode ? '#ffffff' : '#4b5563' }}>{verse.chinese}</p>
                                <p className="text-sm mt-2 italic leading-7" style={{ color: darkMode ? '#9ca3af' : '#9ca3af' }}>{verse.english}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                {isSignedIn && (
                                  <div className="mb-3 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFromFlashcards(verse)}
                                      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                                      style={{
                                        backgroundColor: darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(241,245,249,0.9)',
                                        color: darkMode ? '#cbd5e1' : '#64748b',
                                        border: `1px solid ${darkMode ? 'rgba(148,163,184,0.18)' : 'rgba(203,213,225,0.9)'}`,
                                      }}
                                      aria-label="从闪卡中删除"
                                    >
                                      <IconTrash />
                                      <span
                                        className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                                        style={{
                                          backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(15,23,42,0.78)',
                                          color: '#f8fafc',
                                        }}
                                      >
                                        从闪卡中删除
                                      </span>
                                    </button>
                                  </div>
                                )}
                                {verse.nextReviewDate && (
                                  <p className="text-xs text-gray-500 dark:text-gray-300">
                                    下次复习 {new Date(verse.nextReviewDate).toLocaleDateString('zh-CN')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="max-w-3xl mx-auto space-y-6 pt-4">
              <div
                className="overflow-hidden rounded-[2rem] shadow-xl"
                style={{
                  background: darkMode
                    ? 'linear-gradient(135deg, #161b22 0%, #1c2430 55%, #0f1720 100%)'
                    : 'linear-gradient(135deg, #fffdf6 0%, #f7f2e7 46%, #eef5ff 100%)',
                }}
              >
                <div className="px-6 py-7 md:px-8 md:py-8">
                  <p className="text-xs uppercase tracking-[0.28em] text-primary/80 mb-3">Feedback</p>
                  <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                    反馈
                  </h2>
                  <p className="mt-4 text-xs md:text-sm text-gray-500 dark:text-gray-300">
                    我们会认真阅读每一条反馈，并努力让工具变得更好！
                  </p>
                </div>
              </div>

              <section
                className="rounded-[1.75rem] border p-6 shadow-sm"
                style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >

                <div
                  className="mb-5 rounded-2xl px-4 py-3 text-sm"
                  style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc', color: darkMode ? '#cbd5e1' : '#64748b' }}
                >
                  填写指引：[页面|功能] [什么情况下] [问题|建议]
                </div>

                <textarea
                  value={feedbackInput}
                  onChange={(event) => {
                    setFeedbackInput(event.target.value);
                    if (feedbackSubmitError) setFeedbackSubmitError('');
                    if (feedbackSubmitSuccess) setFeedbackSubmitSuccess('');
                  }}
                  placeholder="例如：[首页闪卡] [左右翻页后] [按钮位置偶尔被顶部导航遮住]"
                  className="min-h-[180px] w-full rounded-3xl border px-5 py-4 text-sm leading-7 outline-none transition-colors focus:border-primary"
                  style={{
                    backgroundColor: darkMode ? '#21262d' : '#f8fafc',
                    borderColor: darkMode ? '#30363d' : '#dbe3ee',
                    color: darkMode ? '#f8fafc' : '#0f172a',
                  }}
                />

                {(feedbackSubmitError || feedbackSubmitSuccess) && (
                  <div
                    className="mt-4 rounded-2xl px-4 py-3 text-sm"
                    style={{
                      backgroundColor: feedbackSubmitError
                        ? (darkMode ? 'rgba(127,29,29,0.28)' : '#fef2f2')
                        : (darkMode ? 'rgba(20,83,45,0.32)' : '#f0fdf4'),
                      color: feedbackSubmitError
                        ? (darkMode ? '#fca5a5' : '#dc2626')
                        : (darkMode ? '#86efac' : '#15803d'),
                    }}
                  >
                    {feedbackSubmitError || feedbackSubmitSuccess}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('my-feedback');
                      void loadMyFeedback();
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-medium transition-colors"
                    style={{
                      borderColor: darkMode ? '#30363d' : '#d1d5db',
                      backgroundColor: darkMode ? '#21262d' : '#ffffff',
                    }}
                  >
                    我的反馈
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitFeedback}
                    disabled={isSubmittingFeedback}
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-md transition-colors hover:bg-blue-600 disabled:opacity-60"
                  >
                    {isSubmittingFeedback ? '提交中...' : '提交反馈'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'my-feedback' && (
            <div className="max-w-3xl mx-auto space-y-6 pt-4">
              <section
                className="rounded-[1.75rem] border p-6 shadow-sm"
                style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">History</p>
                    <h3 className="mt-2 text-2xl font-bold">我的反馈</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('feedback')}
                    className="inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      borderColor: darkMode ? '#30363d' : '#d1d5db',
                      backgroundColor: darkMode ? '#21262d' : '#ffffff',
                    }}
                  >
                    去反馈
                  </button>
                </div>
              </section>

              {myFeedbackLoading ? (
                <div className="rounded-2xl px-6 py-10 text-center text-gray-500" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  正在加载我的反馈...
                </div>
              ) : myFeedbackError ? (
                <div className="rounded-2xl px-6 py-10 text-center text-red-500" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  {myFeedbackError}
                </div>
              ) : myFeedbackItems.length === 0 ? (
                <div className="rounded-2xl px-6 py-10 text-center text-gray-500" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  暂无反馈记录
                </div>
              ) : (
                <div className="space-y-4">
                  {myFeedbackItems.map((item) => (
                    <section
                      key={item.id}
                      className="rounded-[1.75rem] border p-6 shadow-sm"
                      style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                            style={getFeedbackStatusStyle(item.status)}
                          >
                            {getFeedbackStatusLabel(item.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFeedbackDateTime(item.created_at)}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl px-4 py-4 text-sm leading-7" style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc' }}>
                        {item.content}
                      </div>

                      <div className="mt-4 rounded-2xl px-4 py-4" style={{ backgroundColor: darkMode ? '#1c2430' : '#f8fafc' }}>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Reply</p>
                        <p className="mt-3 text-sm leading-7" style={{ color: darkMode ? '#d1d5db' : '#475569' }}>
                          {item.reply?.trim() ? item.reply : '暂无回复'}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>创建时间：{formatFeedbackDateTime(item.created_at) || '--'}</span>
                        <span>修改时间：{formatFeedbackDateTime(item.modified_at) || '--'}</span>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-6 max-w-2xl mx-auto pt-4">
              {leaderboardLoading ? (
                <div className="rounded-2xl px-6 py-10 text-center text-gray-500" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  正在加载排行榜...
                </div>
              ) : leaderboardError ? (
                <div className="rounded-2xl px-6 py-10 text-center text-red-500" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  {leaderboardError}
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="rounded-2xl px-6 py-10 text-center text-gray-500" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
                  暂无排行榜数据
                </div>
              ) : (
                <>
                  <div className="flex justify-center items-end space-x-4 mb-8 px-4">
                    {[leaderboardData[1], leaderboardData[0], leaderboardData[2]].map((item, podiumIndex) => {
                      if (!item) return <div key={podiumIndex} className="w-20" />;

                      const rank = podiumIndex === 1 ? 1 : podiumIndex === 0 ? 2 : 3;
                      const avatarSize = rank === 1 ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-xl';
                      const standClass = rank === 1
                        ? 'w-24 h-32 rounded-t-xl bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/30 shadow-lg'
                        : rank === 2
                          ? 'w-20 h-24 rounded-t-xl shadow-md'
                          : 'w-20 h-20 rounded-t-xl shadow-md';
                      const standStyle = rank === 1
                        ? undefined
                        : { backgroundColor: darkMode ? '#21262d' : '#ffffff' };
                      const rankColor = rank === 1 ? 'text-yellow-600 dark:text-yellow-400' : rank === 2 ? 'text-gray-400' : 'text-orange-400';
                      const borderColor = rank === 1 ? 'border-yellow-200' : rank === 2 ? '' : 'border-orange-300 dark:border-orange-500';

                      return (
                        <div key={item.id} className={`flex flex-col items-center ${rank === 1 ? '-mt-4' : ''}`}>
                          {rank === 1 && <div className="text-4xl mb-1">👑</div>}
                          <div
                            className={`${avatarSize} rounded-full flex items-center justify-center font-bold mb-2 shadow-lg border-4 ${rank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500' : borderColor}`}
                            style={rank === 1 ? undefined : { backgroundColor: darkMode ? '#21262d' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                          >
                            {item.avatar ? (
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-full h-full rounded-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                  const fallback = event.currentTarget.nextElementSibling;
                                  if (fallback) {
                                    fallback.classList.remove('hidden');
                                    fallback.classList.add('flex');
                                  }
                                }}
                              />
                            ) : null}
                            <span className={`${item.avatar ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className={`${standClass} flex flex-col items-center justify-end pb-2`} style={standStyle}>
                            <span className={`text-2xl font-bold ${rankColor}`}>{rank === 1 ? item.masteredCount : rank}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-300 text-center px-1 truncate w-full">{item.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {paginatedLeaderboard.map((item, index) => {
                      const actualIndex = (leaderboardPage - 1) * leaderboardPageSize + index;
                      return (
                        <div key={item.id} className="flex items-center space-x-4 p-4 rounded-xl shadow-md" style={{ backgroundColor: darkMode ? '#21262d' : '#ffffff' }}>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              actualIndex === 0 ? 'bg-yellow-400 text-white' :
                                actualIndex === 1 ? 'bg-gray-400 text-white' :
                                  actualIndex === 2 ? 'bg-orange-400 text-white' :
                                    'text-gray-600 dark:text-gray-300'
                            }`}
                            style={{ backgroundColor: actualIndex < 3 ? undefined : (darkMode ? '#30363d' : '#e5e7eb') }}
                          >
                            {actualIndex + 1}
                          </div>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                            {item.avatar ? (
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                  const fallback = event.currentTarget.nextElementSibling;
                                  if (fallback) {
                                    fallback.classList.remove('hidden');
                                    fallback.classList.add('flex');
                                  }
                                }}
                              />
                            ) : null}
                            <span className={`${item.avatar ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">{item.masteredCount}</p>
                            <p className="text-xs text-gray-400 dark:text-white">节经文</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalLeaderboardPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-6">
                      <button
                        onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                        disabled={leaderboardPage === 1}
                        className="p-2 rounded-lg disabled:opacity-30"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}
                      >
                        <IconChevronLeft />
                      </button>
                      <span className="text-sm">
                        {leaderboardPage} / {totalLeaderboardPages}
                      </span>
                      <button
                        onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                        disabled={leaderboardPage === totalLeaderboardPages}
                        className="p-2 rounded-lg disabled:opacity-30"
                        style={{ backgroundColor: darkMode ? '#21262d' : '#f3f4f6' }}
                      >
                        <IconChevronRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div
                className="hidden md:block overflow-hidden rounded-[2rem] shadow-xl"
                style={{
                  background: darkMode
                    ? 'linear-gradient(135deg, #161b22 0%, #1c2430 55%, #0f1720 100%)'
                    : 'linear-gradient(135deg, #fffdf6 0%, #f7f2e7 46%, #eef5ff 100%)',
                }}
              >
                <div className="px-6 py-7 md:px-8 md:py-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-primary/80 mb-3">Settings</p>
                      <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={{ fontFamily: TITLE_FONT_FAMILY }}>
                        当前设置
                      </h2>
                    </div>
                    <div className="hidden md:flex items-center justify-center text-3xl text-primary/80">
                      ⚙️
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div
                      className="rounded-2xl border px-4 py-4"
                      style={{ backgroundColor: darkMode ? 'rgba(22,27,34,0.72)' : 'rgba(255,255,255,0.7)', borderColor: darkMode ? '#30363d' : '#eadfca' }}
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">中文版本</p>
                      <p className="mt-2 text-lg font-semibold">{settings.chineseVersion === 'cuv' ? '和合本' : settings.chineseVersion.toUpperCase()}</p>
                    </div>
                    <div
                      className="rounded-2xl border px-4 py-4"
                      style={{ backgroundColor: darkMode ? 'rgba(22,27,34,0.72)' : 'rgba(255,255,255,0.7)', borderColor: darkMode ? '#30363d' : '#eadfca' }}
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">英文版本</p>
                      <p className="mt-2 text-lg font-semibold">{settings.englishVersion.toUpperCase()}</p>
                    </div>
                    <div
                      className="rounded-2xl border px-4 py-4"
                      style={{ backgroundColor: darkMode ? 'rgba(22,27,34,0.72)' : 'rgba(255,255,255,0.7)', borderColor: darkMode ? '#30363d' : '#eadfca' }}
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">圣经数据</p>
                      <p className="mt-2 text-lg font-semibold">{staticDataUpdating ? '更新中' : '本地优先'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
                <section
                  className="rounded-[1.75rem] border p-6 shadow-sm"
                  style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                >
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Display</p>
                    <h3 className="mt-2 text-2xl font-bold">修改版本</h3>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl p-4" style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc' }}>
                      <label className="block text-sm font-medium mb-2">中文版本</label>
                      <select
                        value={versionDraft.chineseVersion}
                        onChange={(e) => handleVersionSettingsChange({ chineseVersion: e.target.value })}
                        className="w-full px-4 py-3 border rounded-xl"
                        style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                      >
                        <option value="cuv">和合本</option>
                      </select>
                    </div>

                    <div className="rounded-2xl p-4" style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc' }}>
                      <label className="block text-sm font-medium mb-2">英文版本</label>
                      <select
                        value={versionDraft.englishVersion}
                        onChange={(e) => handleVersionSettingsChange({ englishVersion: e.target.value })}
                        className="w-full px-4 py-3 border rounded-xl"
                        style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#d1d5db' }}
                      >
                        <option value="esv">ESV</option>
                        <option value="niv">NIV</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 min-h-[1rem]">
                        {versionSettingsMessage}
                      </p>
                      <button
                        type="button"
                        onClick={handleSaveVersionSettings}
                        disabled={
                          isSavingVersionSettings ||
                          (versionDraft.chineseVersion === settings.chineseVersion &&
                            versionDraft.englishVersion === settings.englishVersion)
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-primary text-white hover:bg-blue-600 disabled:opacity-60 shadow-md"
                      >
                        {isSavingVersionSettings ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                </section>

                <div className="space-y-5">
                  <section
                    className="rounded-[1.75rem] border p-6 shadow-sm"
                    style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                  >
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Appearance</p>
                      <h3 className="mt-2 text-2xl font-bold">夜间模式</h3>
                    </div>

                    <div className="rounded-2xl p-4" style={{ backgroundColor: darkMode ? '#21262d' : '#f8fafc' }}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{darkMode ? '当前为夜间模式' : '当前为日间模式'}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">切换深色与浅色显示风格</p>
                        </div>
                        <button
                          type="button"
                          onClick={toggleDarkMode}
                          className="inline-flex items-center justify-center rounded-full p-3 transition-colors"
                          style={{
                            backgroundColor: darkMode ? 'rgba(250,204,21,0.14)' : '#e0e7ff',
                            color: darkMode ? '#facc15' : '#4338ca',
                          }}
                          aria-label="切换夜间模式"
                          title="切换夜间模式"
                        >
                          {darkMode ? <IconSun /> : <IconMoon />}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section
                    className="rounded-[1.75rem] border p-6 shadow-sm"
                    style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff', borderColor: darkMode ? '#30363d' : '#e5e7eb' }}
                  >
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Offline Data</p>
                      <h3 className="mt-2 text-2xl font-bold">圣经数据</h3>
                    </div>

                    <div
                      className="mt-6 rounded-3xl p-4"
                      style={{
                        background: darkMode
                          ? 'linear-gradient(160deg, #1b2430 0%, #131a23 100%)'
                          : 'linear-gradient(160deg, #f9fbff 0%, #fef8ef 100%)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">本地圣经数据</p>
                          <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">适合离线阅读与经文检索</p>
                        </div>
                        <span
                          className="shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: darkMode ? 'rgba(59,130,246,0.18)' : '#dbeafe',
                            color: darkMode ? '#93c5fd' : '#1d4ed8',
                          }}
                        >
                          {staticDataUpdating ? '同步中' : '本地缓存'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={refreshStaticBibleData}
                          disabled={staticDataUpdating}
                          className="w-full px-4 py-3 rounded-2xl bg-primary text-white hover:bg-blue-600 disabled:opacity-60 shadow-md"
                        >
                          {staticDataUpdating ? '正在下载并更新...' : '下载与更新本地圣经数据'}
                        </button>

                        {staticDataMessage && (
                          <div
                            className="rounded-2xl px-4 py-3 text-sm"
                            style={{
                              backgroundColor: staticDataMessage.includes('失败')
                                ? (darkMode ? 'rgba(127,29,29,0.28)' : '#fef2f2')
                                : (darkMode ? 'rgba(20,83,45,0.32)' : '#f0fdf4'),
                              color: staticDataMessage.includes('失败')
                                ? (darkMode ? '#fca5a5' : '#dc2626')
                                : (darkMode ? '#86efac' : '#15803d'),
                            }}
                          >
                            {staticDataMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showSelectPlanModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-xl p-6 max-w-md w-full" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
            <h3 className="text-xl font-bold mb-3">将【{selectedPlan.plan_name}】添加到闪卡</h3>
            <label className="flex items-start gap-3 py-4">
              <input
                type="checkbox"
                checked={clearCurrentPlanSelection}
                onChange={(event) => setClearCurrentPlanSelection(event.target.checked)}
                className="mt-1"
              />
              <span>清空当前闪卡列表</span>
            </label>
            {selectedPlanError && (
              <p className="text-sm text-red-500 mb-4">{selectedPlanError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSelectPlanModal(false);
                  setClearCurrentPlanSelection(false);
                }}
                className="px-4 py-2 rounded-xl border"
                style={{ borderColor: darkMode ? '#30363d' : '#d1d5db' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSelectPlan}
                disabled={isSelectingPlan}
                className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isSelectingPlan ? '确认中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
            style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}
          >
            <h3 className="text-xl font-bold">确认删除账号？</h3>
            <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
              此操作无法恢复。
            </p>

            {deleteAccountError && (
              <p className="mt-4 text-sm text-red-500">{deleteAccountError}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (isDeletingAccount) return;
                  setShowDeleteAccountModal(false);
                  setDeleteAccountError('');
                }}
                className="rounded-xl border px-4 py-3 font-medium transition-colors"
                style={{ borderColor: darkMode ? '#30363d' : '#d1d5db', backgroundColor: darkMode ? '#21262d' : '#ffffff' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="rounded-xl px-4 py-3 font-medium text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#dc2626' }}
              >
                {isDeletingAccount ? '删除中...' : '确认删除账号'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 下一组弹窗 */}
      {showNextGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-xl p-8 max-w-md w-full text-center" style={{ backgroundColor: darkMode ? '#161b22' : '#ffffff' }}>
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold mb-2">太棒了！</h3>
            <p className="text-gray-500 mb-6">你已经完成了当前组的所有经文</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowNextGroupModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-200"
                style={{ backgroundColor: darkMode ? '#30363d' : '#e5e7eb' }}
              >
                稍后继续
              </button>
              <button
                onClick={startNextGroup}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600"
              >
                开始下一组
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App
