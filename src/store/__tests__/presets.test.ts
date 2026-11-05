import { getSound } from '@/data/sounds';

import { PRESET_MIXES, useMixes, withPresets } from '../mixes';

describe('ready-made mixes', () => {
  it('are there on a new install', () => {
    const ids = useMixes.getInitialState().mixes.map((m) => m.id);
    expect(ids).toEqual(['preset-rain-528', 'preset-ocean-bowl', 'preset-brown-174']);
    expect(PRESET_MIXES.map((m) => m.name)).toEqual([
      'Rain + 528',
      'Ocean + Singing Bowl',
      'Brown Noise + 174',
    ]);
  });

  it('are added once when updating, next to the parent’s own mixes', () => {
    const own = { id: 'mix-1', name: 'Nap', layers: [{ soundId: 'rain', volume: 0.8 }] };
    expect(withPresets([own]).map((m) => m.id)).toEqual([
      'mix-1',
      'preset-rain-528',
      'preset-ocean-bowl',
      'preset-brown-174',
    ]);
    // Already there (perhaps edited): left alone.
    const edited = { ...PRESET_MIXES[0], name: 'Our rain' };
    expect(withPresets([edited]).filter((m) => m.id === 'preset-rain-528')).toEqual([edited]);
  });

  it('upgrading from the old storage adds them; later loads keep deletions', async () => {
    const migrate = useMixes.persist.getOptions().migrate!;
    const fromV1 = (await migrate({ mixes: [] }, 1)) as { mixes: { id: string }[] };
    expect(fromV1.mixes).toHaveLength(3);
    const keptOne = { mixes: [PRESET_MIXES[1]] };
    const fromV2 = (await migrate(keptOne, 2)) as { mixes: { id: string }[] };
    expect(fromV2.mixes.map((m) => m.id)).toEqual(['preset-ocean-bowl']);
  });

  it('can be edited and deleted like the parent’s own', () => {
    useMixes.setState({ mixes: PRESET_MIXES });
    useMixes.getState().saveMix({ ...PRESET_MIXES[0], name: 'Rainy 528' });
    expect(useMixes.getState().mixes[0]).toMatchObject({
      id: 'preset-rain-528',
      name: 'Rainy 528',
    });
    useMixes.getState().deleteMix('preset-brown-174');
    expect(useMixes.getState().mixes.map((m) => m.id)).not.toContain('preset-brown-174');
  });

  it('only use sounds that exist', () => {
    for (const mix of PRESET_MIXES) {
      for (const layer of mix.layers) expect(getSound(layer.soundId)?.id).toBe(layer.soundId);
    }
  });
});
