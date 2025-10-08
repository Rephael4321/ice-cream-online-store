"use client";

import React, { useState } from "react";
import Cookies from "js-cookie";
import OrderHistoryModal from "./ui/order-history-modal";

export default function OrderHistoryButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    const phoneNumber = Cookies.get("phoneNumber");
    if (!phoneNumber) {
      // Show a message that they need to make an order first
      alert("יש לבצע הזמנה כדי לראות היסטוריית הזמנות");
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="bg-blue-400 text-white px-3 py-2 rounded cursor-pointer text-sm sm:text-base hover:bg-blue-500 transition-colors"
        title="היסטורית הזמנות"
      >
        היסטורית הזמנות
      </button>

      <OrderHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

