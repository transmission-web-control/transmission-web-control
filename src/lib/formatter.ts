export function formatLongTime(time: string): string {
  if (!time) {
    return '';
  }

  const now = new Date(parseInt(time) * 1000);
  return formatDate(now);
}

function pad(s: number, n = 2): string {
  return s.toString().padStart(n, '0');
}

export function formatDate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth())}-${pad(date.getDay())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Get the ETA
export function formatDuration(seconds: number | string) {
  const ms = typeof seconds === 'string' ? parseInt(seconds) : seconds;

  if (ms < 1) {
    return '';
  }

  return duration(ms);
}

function duration(durationSeconds: number) {
  const s: string[] = [];

  const years = Math.floor(durationSeconds / 31536000);
  if (years) {
    s.push(`${years}y`);
  }

  const days = Math.floor((durationSeconds %= 31536000) / 86400);
  if (days) {
    s.push(`${days}d`);
  }

  const hours = Math.floor((durationSeconds %= 86400) / 3600);
  if (hours) {
    s.push(`${hours}h`);
  }

  const minutes = Math.floor((durationSeconds %= 3600) / 60);
  if (minutes) {
    s.push(`${minutes}m`);
  }

  const seconds = Math.floor(durationSeconds % 60);
  if (seconds) {
    s.push(`${seconds}s`);
  }

  return s.join(' ');
}

interface Color {
  R: number;
  G: number;
  B: number;
}

/**
 * 根据指定的十六进制颜色值，返回RGB颜色数值
 */
export function getRGB(s: string): Color {
  const reg = /^#([0-9a-f]{3}|[0-9a-f]{6})$/;
  let color = s.toLowerCase();
  if (color && reg.test(color)) {
    if (color.length === 4) {
      let sColorNew = '#';
      for (let i = 1; i < 4; i += 1) {
        sColorNew += color.slice(i, i + 1).concat(color.slice(i, i + 1));
      }
      color = sColorNew;
    }

    // 处理六位的颜色值
    const result = [];
    for (let i = 1; i < 7; i += 2) {
      result.push(parseInt(color.slice(i, i + 2), 16));
    }

    return {
      R: result[0]!,
      G: result[1]!,
      B: result[2]!,
    };
  } else {
    return {
      R: 0,
      G: 0,
      B: 0,
    };
  }
}

/**
 * 获取一个颜色的人眼感知亮度，并以 0~1 之间的小数表示。
 * @param {*} color
 */
export function getGrayLevel(color: string | undefined | Color): number {
  if (!color) {
    color = {
      R: 0,
      G: 0,
      B: 0,
    };
  }
  if (typeof color === 'string') {
    color = getRGB(color);
  }
  return (0.299 * color.R + 0.587 * color.G + 0.114 * color.B) / 255;
}
