import { klona } from 'klona';
import { Crown, Edit3, Gift, Hash, Save, Star, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { getRuntimeSchema } from '../../utils/schemaLoader';
import { useMvuData } from '../../hooks/useMvuData';

interface LuckModalProps {
  data: any;
  onUpdateMvuData?: (newData: any) => void;
}

type PrizeItem = {
  名称: string;
  分类: string;
  出货概率: number;
  数量: number;
  品阶: string;
  描述: string;
  固定加成: string[];
  效果: string[];
  内容: string[];
  灵石类型: string;
  着装类型: string;
  招式: Array<{ 名称: string; 描述: string; 效果: string[] }>;
};

type PoolKey = '丙等卜算' | '乙等卜算' | '甲等卜算';

const buildEmptyPrize = (rank: string): PrizeItem => ({
  名称: '未知物品',
  分类: '未知',
  出货概率: 0,
  数量: 1,
  品阶: rank,
  描述: '暂无描述',
  固定加成: [],
  效果: [],
  内容: [],
  灵石类型: '',
  着装类型: '',
  招式: [],
});

const parseLines = (value: string) =>
  (value || '')
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean);

const stringifyLines = (values?: string[]) => (values || []).join('\n');

const LuckModal: React.FC<LuckModalProps> = ({ onUpdateMvuData }) => {
  const [mvuData, setMvuData] = useMvuData(getRuntimeSchema);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  const pools = useMemo(
    () => [
      { key: '丙等卜算' as PoolKey, label: '丙等卜算', highestRank: '地阶', secondaryRank: '玄阶', accentClass: 'text-amber-500' },
      { key: '乙等卜算' as PoolKey, label: '乙等卜算', highestRank: '天阶', secondaryRank: '地阶', accentClass: 'text-emerald-500' },
      { key: '甲等卜算' as PoolKey, label: '甲等卜算', highestRank: '仙阶', secondaryRank: '天阶', accentClass: 'text-purple-500' },
    ],
    [],
  );

  useEffect(() => {
    if (!isEditing) {
      setDraft(null);
      return;
    }
    setDraft(klona(mvuData.天运卜算 || {}));
  }, [isEditing, mvuData]);

  const ensurePool = (poolKey: PoolKey, base?: any) => {
    const pool = base?.[poolKey] || {};
    const highestRaw = pool.最高级奖品;
    return {
      最高级奖品: Array.isArray(highestRaw) ? highestRaw : (highestRaw ? [highestRaw] : []),
      次高级奖品: Array.isArray(pool.次高级奖品) ? pool.次高级奖品 : [],
    };
  };

  const getSource = () => (isEditing ? draft : mvuData.天运卜算) || {};
  const lotteryCount = getSource().已抽奖次数 ?? 0;

  const updateDraft = (next: any) => {
    setDraft(next);
  };

  const saveDraft = () => {
    if (!draft) return;
    const newData = klona(mvuData);
    newData.天运卜算 = draft;
    setMvuData(newData);
    onUpdateMvuData?.(newData);
    setIsEditing(false);
  };

  const updatePrizeField = (
    poolKey: PoolKey,
    target: '最高级奖品' | '次高级奖品',
    index: number | null,
    field: keyof PrizeItem,
    value: any,
  ) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    if (target === '最高级奖品') {
      if (!Array.isArray(pool.最高级奖品)) pool.最高级奖品 = [];
      if (index === null) return;
      if (!pool.最高级奖品[index]) {
        pool.最高级奖品[index] = buildEmptyPrize(pools.find(p => p.key === poolKey)!.highestRank);
      }
      pool.最高级奖品[index][field] = value;
    } else {
      if (!Array.isArray(pool.次高级奖品)) pool.次高级奖品 = [];
      if (index === null) return;
      if (!pool.次高级奖品[index]) {
        pool.次高级奖品[index] = buildEmptyPrize(pools.find(p => p.key === poolKey)!.secondaryRank);
      }
      pool.次高级奖品[index][field] = value;
    }
    next[poolKey] = pool;
    updateDraft(next);
  };

  const updateProbability = (
    poolKey: PoolKey,
    target: '最高级奖品' | '次高级奖品',
    index: number | null,
    value: number,
  ) => {
    const nextValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
    updatePrizeField(poolKey, target, index, '出货概率', nextValue);
  };

  const addSecondaryPrize = (poolKey: PoolKey) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.次高级奖品 = [...pool.次高级奖品, buildEmptyPrize(pools.find(p => p.key === poolKey)!.secondaryRank)];
    next[poolKey] = pool;
    updateDraft(next);
  };

  const removeSecondaryPrize = (poolKey: PoolKey, index: number) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.次高级奖品 = pool.次高级奖品.filter((_: any, i: number) => i !== index);
    next[poolKey] = pool;
    updateDraft(next);
  };

  const addHighestPrize = (poolKey: PoolKey, rank: string) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.最高级奖品 = [...pool.最高级奖品, buildEmptyPrize(rank)];
    next[poolKey] = pool;
    updateDraft(next);
  };

  const removeHighestPrize = (poolKey: PoolKey, index: number) => {
    if (!draft) return;
    const next = klona(draft);
    const pool = ensurePool(poolKey, next);
    pool.最高级奖品 = pool.最高级奖品.filter((_: any, i: number) => i !== index);
    next[poolKey] = pool;
    updateDraft(next);
  };

  const renderPrize = (
    item: PrizeItem | null,
    rank: string,
    editing: boolean,
    onUpdate: (field: keyof PrizeItem, value: any) => void,
    onUpdateProb?: (value: number) => void,
  ) => {
    if (!item) {
      return (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
          暂无设置
        </div>
      );
    }

    if (!editing) {
      return (
        <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800">{item.名称 || '未命名物品'}</div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              {rank}
            </span>
          </div>
          <div className="text-xs text-slate-500">出货概率：{item.出货概率 ?? 0}% · 数量：{item.数量 ?? 1}</div>
          <div className="text-xs text-slate-500">分类：{item.分类 || '未知'} · 品阶：{item.品阶 || rank}</div>
          {item.描述 && <div className="text-xs text-slate-600 italic">{item.描述}</div>}
        </div>
      );
    }

    return (
      <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">
            名称
            <input
              value={item.名称 || ''}
              onChange={e => onUpdate('名称', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            分类
            <input
              value={item.分类 || ''}
              onChange={e => onUpdate('分类', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            品阶
            <input
              value={item.品阶 || rank}
              onChange={e => onUpdate('品阶', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            数量
            <input
              type="number"
              value={item.数量 ?? 1}
              onChange={e => onUpdate('数量', Number(e.target.value) || 0)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            出货概率(%)
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={item.出货概率 ?? 0}
                onChange={e => onUpdateProb?.(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <input
                type="number"
                value={item.出货概率 ?? 0}
                onChange={e => onUpdateProb?.(parseFloat(e.target.value) || 0)}
                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-mono"
              />
            </div>
          </label>
          <label className="text-xs text-slate-500">
            灵石类型
            <input
              value={item.灵石类型 || ''}
              onChange={e => onUpdate('灵石类型', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs text-slate-500">
            着装类型
            <input
              value={item.着装类型 || ''}
              onChange={e => onUpdate('着装类型', e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs"
            />
          </label>
        </div>

        <label className="text-xs text-slate-500 block">
          描述
          <textarea
            value={item.描述 || ''}
            onChange={e => onUpdate('描述', e.target.value)}
            className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs text-slate-500">
            固定加成
            <textarea
              value={stringifyLines(item.固定加成)}
              onChange={e => onUpdate('固定加成', parseLines(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
              placeholder="每行一条"
            />
          </label>
          <label className="text-xs text-slate-500">
            效果
            <textarea
              value={stringifyLines(item.效果)}
              onChange={e => onUpdate('效果', parseLines(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
              placeholder="每行一条"
            />
          </label>
          <label className="text-xs text-slate-500">
            内容
            <textarea
              value={stringifyLines(item.内容)}
              onChange={e => onUpdate('内容', parseLines(e.target.value))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs min-h-[70px]"
              placeholder="每行一条"
            />
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <h2 className="text-xl font-black text-slate-800 tracking-tight">天运卜算</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">已抽奖次数：</span>
            <span className="text-[10px] font-black text-emerald-600">{lotteryCount}</span>
          </div>
          <button
            onClick={() => (isEditing ? saveDraft() : setIsEditing(true))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-sm ${
              isEditing
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? '保存设置' : '编辑奖池'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {pools.map(pool => {
          const source = getSource();
          const poolData = ensurePool(pool.key, source);
          return (
            <section key={pool.key} className="bg-white/70 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800">
                  <Star className={`w-4 h-4 ${pool.accentClass}`} />
                  <h3 className="text-lg font-black">{pool.label}</h3>
                </div>
                {isEditing && (
                  <button
                    onClick={() => addHighestPrize(pool.key, pool.highestRank)}
                    className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-50"
                  >
                    添加最高级奖品
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  <Crown className="w-4 h-4 text-amber-500" />
                  最高级奖品（{pool.highestRank}）
                </div>
                {poolData.最高级奖品.length === 0 && (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                    暂无最高级奖品
                  </div>
                )}
                {poolData.最高级奖品.map((item: any, idx: number) => (
                  <div key={`${pool.key}-highest-${idx}`} className="relative">
                    {renderPrize(
                      item,
                      pool.highestRank,
                      !!isEditing,
                      (field, value) => updatePrizeField(pool.key, '最高级奖品', idx, field, value),
                      (value) => updateProbability(pool.key, '最高级奖品', idx, value),
                    )}
                    {isEditing && (
                      <button
                        onClick={() => removeHighestPrize(pool.key, idx)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    次高级奖品（{pool.secondaryRank}）
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => addSecondaryPrize(pool.key)}
                      className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-50"
                    >
                      添加奖品
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {poolData.次高级奖品.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                      暂无次高级奖品
                    </div>
                  )}
                  {poolData.次高级奖品.map((item, idx) => (
                    <div key={`${pool.key}-${idx}`} className="relative">
                      {renderPrize(
                        item,
                        pool.secondaryRank,
                        !!isEditing,
                        (field, value) => updatePrizeField(pool.key, '次高级奖品', idx, field, value),
                        (value) => updateProbability(pool.key, '次高级奖品', idx, value),
                      )}
                      {isEditing && (
                        <button
                          onClick={() => removeSecondaryPrize(pool.key, idx)}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default LuckModal;
