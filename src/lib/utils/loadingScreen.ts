import {
	ALL_CORNERS,
	BASE_RUSH,
	FANG_CURVATURE,
	LoadingCorner,
	TIP_OVERSHOOT,
	WORD_DRAG_K,
	WORD_DRAG_LAG,
	WORD_DRAG_S,
	type LoadingText
} from '$lib/constants/loadingScreen';

export type WordKey = keyof LoadingText;

const WORD_POSITIONS: Record<WordKey, { x: number; y: number }> = {
	topLeft: { x: 0, y: 0 },
	topRight: { x: 1, y: 0 },
	bottomLeft: { x: 0, y: 1 },
	bottomRight: { x: 1, y: 1 },
	center: { x: 0.5, y: 0.5 }
};

const getAnchorFraction = (corner: LoadingCorner): { x: number; y: number } => {
	switch (corner) {
		case LoadingCorner.TopLeft:
			return { x: 0, y: 0 };
		case LoadingCorner.TopRight:
			return { x: 1, y: 0 };
		case LoadingCorner.BottomLeft:
			return { x: 0, y: 1 };
		case LoadingCorner.BottomRight:
			return { x: 1, y: 1 };
	}
};

export const buildWordPull = (
	key: WordKey,
	corner: LoadingCorner,
	progress: number,
	width: number,
	height: number
): string => {
	const word = WORD_POSITIONS[key];
	const anchor = getAnchorFraction(corner);
	const dxRaw = anchor.x - word.x;
	const dyRaw = anchor.y - word.y;
	const normalizedDist = Math.min(1, Math.hypot(dxRaw, dyRaw) / Math.SQRT2);
	const lagPower = 1 + normalizedDist * WORD_DRAG_LAG;
	const easedProgress = Math.pow(progress, lagPower);
	const dx = dxRaw * width * easedProgress * WORD_DRAG_K;
	const dy = dyRaw * height * easedProgress * WORD_DRAG_K;
	const scale = 1 - easedProgress * WORD_DRAG_S;
	return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(3)})`;
};

export const pickRandomCorner = (): LoadingCorner => {
	return ALL_CORNERS[Math.floor(Math.random() * ALL_CORNERS.length)];
};

export const resolveCorner = (input: LoadingCorner | 'random'): LoadingCorner => {
	return input === 'random' ? pickRandomCorner() : input;
};

type Pt = { x: number; y: number };

const flipPt = (p: Pt, corner: LoadingCorner, w: number, h: number): Pt => {
	let { x, y } = p;
	if (corner === LoadingCorner.BottomLeft || corner === LoadingCorner.TopLeft) {
		x = w - x;
	}
	if (corner === LoadingCorner.TopRight || corner === LoadingCorner.TopLeft) {
		y = h - y;
	}
	return { x, y };
};

const fmt = (p: Pt) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

export const buildTearPath = (
	progress: number,
	width: number,
	height: number,
	corner: LoadingCorner
): string => {
	if (width === 0 || height === 0) return '';

	const W = width;
	const H = height;
	const baseProgress = Math.pow(progress, BASE_RUSH);
	const perim = baseProgress * (W + H);

	const baseTopOnRight = perim <= H;
	const baseTop: Pt = baseTopOnRight
		? { x: W, y: H - perim }
		: { x: Math.max(0, W - (perim - H)), y: 0 };

	const baseLeftOnBottom = perim <= W;
	const baseLeft: Pt = baseLeftOnBottom
		? { x: W - perim, y: H }
		: { x: 0, y: Math.max(0, H - (perim - W)) };

	const tip: Pt = {
		x: W - progress * W * TIP_OVERSHOOT,
		y: H - progress * H * TIP_OVERSHOOT
	};

	const anchor: Pt = { x: W, y: H };
	const curveFade = Math.max(0, 1 - Math.max(0, progress - 0.65) / 0.35);
	const curve = FANG_CURVATURE * curveFade;

	const c1: Pt = {
		x: baseTop.x + (tip.x - baseTop.x) * 0.35 + (anchor.x - baseTop.x) * curve,
		y: baseTop.y + (tip.y - baseTop.y) * 0.35 + (anchor.y - baseTop.y) * curve
	};
	const c2: Pt = {
		x: baseTop.x + (tip.x - baseTop.x) * 0.75 + (anchor.x - tip.x) * curve * 0.6,
		y: baseTop.y + (tip.y - baseTop.y) * 0.75 + (anchor.y - tip.y) * curve * 0.6
	};
	const c3: Pt = {
		x: tip.x + (baseLeft.x - tip.x) * 0.25 + (anchor.x - tip.x) * curve * 0.6,
		y: tip.y + (baseLeft.y - tip.y) * 0.25 + (anchor.y - tip.y) * curve * 0.6
	};
	const c4: Pt = {
		x: tip.x + (baseLeft.x - tip.x) * 0.65 + (anchor.x - baseLeft.x) * curve,
		y: tip.y + (baseLeft.y - tip.y) * 0.65 + (anchor.y - baseLeft.y) * curve
	};

	const f = (p: Pt): Pt => flipPt(p, corner, W, H);

	const segments: string[] = [];
	segments.push(`M ${fmt(f({ x: 0, y: 0 }))}`);

	if (baseTopOnRight) {
		segments.push(`L ${fmt(f({ x: W, y: 0 }))}`);
		segments.push(`L ${fmt(f(baseTop))}`);
	} else {
		segments.push(`L ${fmt(f(baseTop))}`);
	}

	segments.push(`C ${fmt(f(c1))}, ${fmt(f(c2))}, ${fmt(f(tip))}`);
	segments.push(`C ${fmt(f(c3))}, ${fmt(f(c4))}, ${fmt(f(baseLeft))}`);

	if (baseLeftOnBottom) {
		segments.push(`L ${fmt(f({ x: 0, y: H }))}`);
	}

	segments.push('Z');
	return segments.join(' ');
};
