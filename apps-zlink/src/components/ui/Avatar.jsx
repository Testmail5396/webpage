import React from "react";

const sizes = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
  "2xl": "w-20 h-20 text-2xl",
};

export function Avatar({ user, size = "sm", className = "" }) {
  if (!user) return null;
  return (
    <div
      className={`${sizes[size]} ${user.avatarColor || "bg-indigo-500"} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      title={user.name}
    >
      {user.avatar}
    </div>
  );
}

export function AvatarStack({ users, max = 3, size = "sm" }) {
  const visible = users.slice(0, max);
  const rest = users.length - max;
  const sizeMap = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
  };

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <div
          key={user.id}
          className={`${sizeMap[size] || sizeMap.sm} ${
            user.avatarColor || "bg-indigo-500"
          } rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white flex-shrink-0`}
          title={user.name}
        >
          {user.avatar}
        </div>
      ))}
      {rest > 0 && (
        <div
          className={`${sizeMap[size] || sizeMap.sm} bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold ring-2 ring-white flex-shrink-0`}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
