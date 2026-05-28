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
  const WIDTH = 600;
  const HEIGHT = 700;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");

  // Background gradient (purple to pink)
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, "#9333ea");
  grad.addColorStop(1, "#ec4899");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // White card
  const cardX = 30;
  const cardY = 30;
  const cardW = WIDTH - 60;
  const cardH = HEIGHT - 60;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();

  let y = 70;

  // App name
  ctx.fillStyle = "#9333ea";
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fun Predict", WIDTH / 2, y);
  y += 40;

  // Event name
  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  const eventLines = wrapText(ctx, eventName || "Event", cardW - 60);
  for (const line of eventLines) {
    ctx.fillText(line, WIDTH / 2, y);
    y += 28;
  }
  y += 15;

  // Divider
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, y);
  ctx.lineTo(cardX + cardW - 30, y);
  ctx.stroke();
  y += 25;

  // User name
  ctx.fillStyle = "#6b7280";
  ctx.font = "16px system-ui, -apple-system, sans-serif";
  ctx.fillText(userName || "Player", WIDTH / 2, y);
  y += 35;

  // Rank
  ctx.fillStyle = "#9333ea";
  ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
  ctx.fillText(`#${rank}`, WIDTH / 2, y);
  y += 25;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.fillText(`of ${totalPlayers} players`, WIDTH / 2, y);
  y += 35;

  // Net profit
  const profitColor = netProfit >= 0 ? "#16a34a" : "#ef4444";
  ctx.fillStyle = profitColor;
  ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
  const profitText = `${netProfit >= 0 ? "+" : ""}$${netProfit.toFixed(2)}`;
  ctx.fillText(profitText, WIDTH / 2, y);
  y += 22;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.fillText("net profit", WIDTH / 2, y);
  y += 35;

  // Divider
  ctx.strokeStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(cardX + 30, y);
  ctx.lineTo(cardX + cardW - 30, y);
  ctx.stroke();
  y += 20;

  // Top bets
  if (topBets && topBets.length > 0) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Top Predictions", WIDTH / 2, y);
    y += 20;

    ctx.textAlign = "left";
    ctx.font = "13px system-ui, -apple-system, sans-serif";

    for (const bet of topBets.slice(0, 4)) {
      const icon = bet.won ? "\u2705" : bet.voided ? "\u2796" : "\u274C";
      ctx.fillStyle = "#374151";
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
  ctx.fillStyle = "#d1d5db";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText("funpredict.app", WIDTH / 2, HEIGHT - 50);

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
