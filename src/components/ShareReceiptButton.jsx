import { useState } from "react";
import { generateReceipt } from "../utils/receiptGenerator";
import { motion } from "framer-motion";

export default function ShareReceiptButton({
  eventName,
  userName,
  rank,
  totalPlayers,
  netProfit,
  topBets,
}) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const blob = await generateReceipt({
        eventName,
        userName,
        rank,
        totalPlayers,
        netProfit,
        topBets,
      });

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], "hunch-receipt.png", {
          type: "image/png",
        });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hunch-receipt.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing receipt:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      disabled={loading}
      className="w-full bg-brand text-white font-bold py-3 rounded-xl border-2 border-ink shadow-[4px_4px_0_0_#181410] disabled:opacity-50 flex items-center justify-center gap-2"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          Generating...
        </>
      ) : (
        <>
          {"\uD83D\uDCF8"} Share Receipt
        </>
      )}
    </motion.button>
  );
}
