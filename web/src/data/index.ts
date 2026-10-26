import alisaData from './alisa.json';
import asukaData from './asuka.json';
import azucenaData from './azucena.json';
import bryanData from './bryan.json';
import claudioData from './claudio.json';
import devilJinData from './devil_jin.json';
import eddyData from './eddy.json';
import fengData from './feng.json';
import hwoarangData from './hwoarang.json';
import jack8Data from './jack_8.json';
import jinData from './jin.json';
import junData from './jun.json';
import kazuyaData from './kazuya.json';
import kingData from './king.json';
import kumaData from './kuma.json';
import larsData from './lars.json';
import leeData from './lee.json';
import leoData from './leo.json';
import leroyData from './leroy.json';
import lidiaData from './lidia.json';
import liliData from './lili.json';
import lawData from './law.json';
import ninaData from './nina.json';
import pandaData from './panda.json';
import paulData from './paul.json';
import ravenData from './raven.json';
import reinaData from './reina.json';
import shaheenData from './shaheen.json';
import steveData from './steve.json';
import victorData from './victor.json';
import xiaoyuData from './xiaoyu.json';
import yoshimitsuData from './yoshimitsu.json';
import zafinaData from './zafina.json';
import heihachiData from './heihachi.json';
import armorKingData from './armor_king.json';

import { cleanNotation } from '../utils/notation';
import type { CharacterName, Move } from '../types/tekken';

const cleanEntity = (str?: string | null): string => {
  if (!str) return '';
  let cleaned = str
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');

  // Strip all raw HTML tags like <div ...>, </div>, <span>, </span>
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  // Clean markdown bullet points or dotlist asterisks into clean slashes
  cleaned = cleaned.replace(/\s*\*\s*/g, ' / ');
  // Clean repeated slashes
  cleaned = cleaned.replace(/\s*\/\s*(\/\s*)+/g, ' / ');
  // Trim leading/trailing slashes and whitespace
  cleaned = cleaned.replace(/^[\s\/]+|[\s\/]+$/g, '');
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

const parseWikiValue = (val?: string | null): { text: string; tooltip?: string } => {
  if (!val) return { text: '-' };

  // First unescape standard HTML entities
  let str = val
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');

  const tooltips: string[] = [];

  // Match [[target|display]] or [[target]]
  str = str.replace(/\[\[(?:([^\]|]+)\|)?([^\]]+)\]\]/g, (_match, target, display) => {
    if (target) {
      const cleanTarget = target.replace(/#/g, ': ').replace(/_/g, ' ').trim();
      tooltips.push(cleanTarget);
      return display.trim();
    }
    return display.trim();
  });

  // Strip any lingering HTML tags
  str = str.replace(/<[^>]+>/g, ' ');
  str = str.replace(/\s+/g, ' ').trim();

  return {
    text: str || '-',
    tooltip: tooltips.length > 0 ? tooltips.join(' | ') : undefined,
  };
};

const preprocessMoves = (rawMoves: any[]): Move[] => {
  const initialMoves: Move[] = rawMoves.map((m) => {
    const cleanName = cleanEntity(m.name);
    const cleanInput = cleanNotation(m.input);
    const cleanId = cleanNotation((m.id || '').split('-').slice(1).join(''));
    const parsedHit = parseWikiValue(m.hit);
    const parsedCh = parseWikiValue(m.ch);
    const parsedBlock = parseWikiValue(m.block);
    const cleanDmg = (m.damage || '')
      .replace(/\s*,\s*,\s*/g, ', ')
      .replace(/\(\s*,\s*/g, '(')
      .replace(/\s*,\s*\)/g, ')');

    return {
      ...m,
      name: cleanName,
      damage: cleanDmg || m.damage,
      hit: parsedHit.text,
      hit_tooltip: parsedHit.tooltip,
      ch: parsedCh.text,
      ch_tooltip: parsedCh.tooltip,
      block: parsedBlock.text,
      block_tooltip: parsedBlock.tooltip,
      _cleanName: cleanName,
      _cleanInput: cleanInput,
      _cleanId: cleanId,
      _lowerName: cleanName.toLowerCase(),
      _lowerInput: (m.input || '').toLowerCase(),
    };
  });

  // Second pass: Detect string extensions and resolve fallback videos for incomplete strings
  return initialMoves.map((m) => {
    const inp = (m.input || '').trim();
    if (!inp) return m;

    const prefix = inp + ',';

    // Find all followups starting with inp + ','
    const allExtensions = initialMoves.filter(
      (cand) => cand.input && cand.input.startsWith(prefix)
    );

    const hasStringExtensions = allExtensions.length > 0;
    let stringExtensionSample: string | null = null;
    let videoUrl = m.video_url;
    let isStringVideo = false;
    let videoStringParent: string | null = null;

    if (hasStringExtensions) {
      // Sort by shortest input length to get the immediate/closest follow-up
      const sorted = [...allExtensions].sort(
        (a, b) => (a.input?.length ?? 0) - (b.input?.length ?? 0)
      );
      stringExtensionSample = sorted[0].input;

      // If this move does not have a video, try to borrow from the closest follow-up that has video
      if (!videoUrl) {
        const withVideo = sorted.filter((cand) => cand.video_url);
        if (withVideo.length > 0) {
          videoUrl = withVideo[0].video_url;
          isStringVideo = true;
          videoStringParent = withVideo[0].input;
        }
      }
    }

    return {
      ...m,
      video_url: videoUrl,
      is_string_video: isStringVideo,
      video_string_parent: videoStringParent,
      has_string_extensions: hasStringExtensions,
      string_extension_sample: stringExtensionSample,
    };
  });
};

export const CHARACTER_DATA: Record<CharacterName, Move[]> = {
  Alisa: preprocessMoves(alisaData),
  Asuka: preprocessMoves(asukaData),
  Azucena: preprocessMoves(azucenaData),
  Bryan: preprocessMoves(bryanData),
  Claudio: preprocessMoves(claudioData),
  'Devil Jin': preprocessMoves(devilJinData),
  Eddy: preprocessMoves(eddyData),
  Feng: preprocessMoves(fengData),
  Hwoarang: preprocessMoves(hwoarangData),
  'Jack-8': preprocessMoves(jack8Data),
  Jin: preprocessMoves(jinData),
  Jun: preprocessMoves(junData),
  Kazuya: preprocessMoves(kazuyaData),
  King: preprocessMoves(kingData),
  Kuma: preprocessMoves(kumaData),
  Lars: preprocessMoves(larsData),
  Lee: preprocessMoves(leeData),
  Leo: preprocessMoves(leoData),
  Leroy: preprocessMoves(leroyData),
  Lidia: preprocessMoves(lidiaData),
  Lili: preprocessMoves(liliData),
  Law: preprocessMoves(lawData),
  Nina: preprocessMoves(ninaData),
  Panda: preprocessMoves(pandaData),
  Paul: preprocessMoves(paulData),
  Raven: preprocessMoves(ravenData),
  Reina: preprocessMoves(reinaData),
  Shaheen: preprocessMoves(shaheenData),
  Steve: preprocessMoves(steveData),
  Victor: preprocessMoves(victorData),
  Xiaoyu: preprocessMoves(xiaoyuData),
  Yoshimitsu: preprocessMoves(yoshimitsuData),
  Zafina: preprocessMoves(zafinaData),
  Heihachi: preprocessMoves(heihachiData),
  'Armor King': preprocessMoves(armorKingData),
};

export const CHARACTERS: { name: CharacterName; title: string; style: string; avatar: string; color: string }[] = [
  { name: 'Alisa', title: 'Automaton of Destruction', style: 'Thruster Mobility', avatar: 'AL', color: '#ec4899' },
  { name: 'Asuka', title: 'Spirited Peacemaker', style: 'Kazama Style Arts', avatar: 'AS', color: '#3b82f6' },
  { name: 'Azucena', title: 'Perfect Blend', style: 'Raku', avatar: 'AZ', color: '#f59e0b' },
  { name: 'Bryan', title: 'Harbinger of Chaos', style: 'Kickboxing', avatar: 'BR', color: '#94a3b8' },
  { name: 'Claudio', title: 'Banishing Archer', style: 'Sirius Exorcism Arts', avatar: 'CL', color: '#06b6d4' },
  { name: 'Devil Jin', title: 'Black Wings of Ruin', style: 'Unknown Power', avatar: 'DJ', color: '#8b5cf6' },
  { name: 'Eddy', title: 'Indomitable Flash', style: 'Capoeira', avatar: 'ED', color: '#eab308' },
  { name: 'Feng', title: 'God Fist', style: 'Chinese Martial Arts', avatar: 'FG', color: '#ea580c' },
  { name: 'Hwoarang', title: 'Blood Talon', style: 'Taekwondo', avatar: 'HW', color: '#ef4444' },
  { name: 'Jack-8', title: 'High-Tech Annihilator', style: 'Brute Force', avatar: 'J8', color: '#10b981' },
  { name: 'Jin', title: 'Lightning of Fate', style: 'Traditional Karate', avatar: 'JN', color: '#00d2ff' },
  { name: 'Jun', title: 'Chosen of Light', style: 'Kazama Style Arts', avatar: 'JU', color: '#a7f3d0' },
  { name: 'Kazuya', title: 'Cold-Blooded Oppressor', style: 'Mishima Fighting Karate', avatar: 'KZ', color: '#ff2a5f' },
  { name: 'King', title: 'Anger of the Beast', style: 'Pro Wrestling', avatar: 'KG', color: '#ffcc00' },
  { name: 'Kuma', title: 'Master of Salmon', style: 'Heihachi Kuma Shinken', avatar: 'KM', color: '#b45309' },
  { name: 'Lars', title: 'Iron Lion', style: 'Tekken Forces Arts', avatar: 'LR', color: '#38bdf8' },
  { name: 'Lee', title: 'Silver-Haired Demon', style: 'Martial Arts', avatar: 'LE', color: '#c084fc' },
  { name: 'Leo', title: 'Seeker of Truth', style: 'Bajiquan', avatar: 'LO', color: '#facc15' },
  { name: 'Leroy', title: 'Grandmaster of Drip', style: 'Wing Chun', avatar: 'LY', color: '#f97316' },
  { name: 'Lidia', title: 'Warrior Prime Minister', style: 'Traditional Karate', avatar: 'LD', color: '#e11d48' },
  { name: 'Lili', title: 'Fighting Heiress', style: 'Street Fight Gymnastics', avatar: 'LL', color: '#f43f5e' },
  { name: 'Law', title: 'Legendary Dragon', style: 'Martial Arts', avatar: 'LW', color: '#eab308' },
  { name: 'Nina', title: 'Silent Assassin', style: 'Assassination Arts', avatar: 'NN', color: '#a855f7' },
  { name: 'Panda', title: 'Pretty Beast', style: 'Heihachi Kuma Shinken', avatar: 'PD', color: '#f472b6' },
  { name: 'Paul', title: 'Hot-Blooded Destroyer', style: 'Integrated Judo', avatar: 'PL', color: '#f97316' },
  { name: 'Raven', title: 'Shadow Agent', style: 'Ninjutsu', avatar: 'RV', color: '#6366f1' },
  { name: 'Reina', title: 'Purple Lightning', style: 'Mishima Style + Taido', avatar: 'RN', color: '#b026ff' },
  { name: 'Shaheen', title: 'Desert Falcon', style: 'Military Close Combat', avatar: 'SH', color: '#14b8a6' },
  { name: 'Steve', title: 'Counter-Punching Paragon', style: 'Boxing', avatar: 'ST', color: '#0284c7' },
  { name: 'Victor', title: 'Refined Refractor', style: 'Super Spy CQB', avatar: 'VC', color: '#94a3b8' },
  { name: 'Xiaoyu', title: 'Dancing Phoenix', style: 'Baguazhang / Piguazhang', avatar: 'XY', color: '#fb7185' },
  { name: 'Yoshimitsu', title: 'Mechanized Space Ninja', style: 'Manji Ninjutsu', avatar: 'YS', color: '#10b981' },
  { name: 'Zafina', title: 'Mystic Stargazer', style: 'Ancient Assassination', avatar: 'ZF', color: '#7c3aed' },
  { name: 'Heihachi', title: 'King of Iron Fist', style: 'Mishima Karate', avatar: 'HH', color: '#ffaa00' },
  { name: 'Armor King', title: 'Dark Black Jaguar', style: 'Shoot Wrestling', avatar: 'AK', color: '#a855f7' },
];
