/**
 * Generates a shareable receipt image as a PNG Blob.
 */
export async function generateReceipt({
  eventName,
  userName,
  rank,
  totalPlayers,
  netProfit,
  topBets,
}) {
  // Wait for custom fonts to load
  await document.fonts.ready;

  const WIDTH = 600;
  const HEIGHT = 700;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  // Background — cream
  ctx.fillStyle = "#FFF7EC";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // White card with hard shadow
  const cardX = 30;
  const cardY = 30;
  const cardW = WIDTH - 60;
  const cardH = HEIGHT - 60;

  // Shadow
  ctx.fillStyle = "#181410";
  roundRect(ctx, cardX + 6, cardY + 6, cardW, cardH, 12);
  ctx.fill();

  // Card
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.fill();

  // Card border
  ctx.strokeStyle = "#181410";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.stroke();

  let y = 70;

  // App name — wordmark
  ctx.font = "italic 32px 'Instrument Serif', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#181410";
  ctx.fillText("hunch", WIDTH / 2 - 6, y);
  // Measure "hunch" to position the dot
  const hunchWidth = ctx.measureText("hunch").width;
  ctx.fillStyle = "#FF6B1A";
  ctx.fillText(".", WIDTH / 2 - 6 + hunchWidth / 2 + 2, y);
  y += 40;

  // Event name
  ctx.fillStyle = "#181410";
  ctx.font = "bold 22px 'IBM Plex Sans', system-ui, sans-serif";
  const eventLines = wrapText(ctx, eventName || "Event", cardW - 60);
  for (const line of eventLines) {
    ctx.fillText(line, WIDTH / 2, y);
    y += 28;
  }
  y += 15;

  // Dashed divider
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "#E2D2B0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, y);
  ctx.lineTo(cardX + cardW - 30, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 25;

  // User name
  ctx.fillStyle = "#4A413A";
  ctx.font = "16px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.fillText(userName || "Player", WIDTH / 2, y);
  y += 35;

  // Rank
  ctx.fillStyle = "#FF6B1A";
  ctx.font = "bold 48px 'IBM Plex Mono', monospace";
  ctx.fillText(`#${rank}`, WIDTH / 2, y);
  y += 25;
  ctx.fillStyle = "#8E867D";
  ctx.font = "14px 'IBM Plex Mono', monospace";
  ctx.fillText(`of ${totalPlayers} players`, WIDTH / 2, y);
  y += 35;

  // Net profit
  const profitColor = netProfit >= 0 ? "#00C853" : "#FF3055";
  ctx.fillStyle = profitColor;
  ctx.font = "bold 32px 'IBM Plex Mono', monospace";
  const profitText = `${netProfit >= 0 ? "+" : ""}$${netProfit.toFixed(2)}`;
  ctx.fillText(profitText, WIDTH / 2, y);
  y += 22;
  ctx.fillStyle = "#8E867D";
  ctx.font = "14px 'IBM Plex Mono', monospace";
  ctx.fillText("net profit", WIDTH / 2, y);
  y += 35;

  // Dashed divider
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "#E2D2B0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, y);
  ctx.lineTo(cardX + cardW - 30, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 20;

  // Top bets
  if (topBets && topBets.length > 0) {
    ctx.fillStyle = "#4A413A";
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("TOP PREDICTIONS", WIDTH / 2, y);
    y += 20;

    ctx.textAlign = "left";
    ctx.font = "13px 'IBM Plex Sans', system-ui, sans-serif";

    for (const bet of topBets.slice(0, 4)) {
      const icon = bet.won ? "\u2705" : bet.voided ? "\u2796" : "\u274C";
      ctx.fillStyle = "#181410";
      const betText = `${icon} ${bet.text}`;
      const lines = wrapText(ctx, betText, cardW - 80);
      for (const line of lines) {
        ctx.fillText(line, cardX + 40, y);
        y += 18;
      }
      y += 6;
    }
  }

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#8E867D";
  ctx.font = "italic 14px 'Instrument Serif', Georgia, serif";
  ctx.fillText("hunch.", WIDTH / 2, HEIGHT - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
