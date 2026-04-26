import React from 'react';

type IconProps = {
  className?: string;
  fill?: string;
  strokeColor?: string;
};

/**
 * Awesome Icon (スタンダード・グッド)
 * 迷いのない、最もシンプルで力強い親指の形です。
 */
export const AwesomeIcon = ({ 
  className = "w-6 h-6", 
  fill = "none", 
  strokeColor = "currentColor" 
}: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill={fill} 
    viewBox="0 0 24 24" 
    strokeWidth={2} 
    stroke={strokeColor} 
    className={className}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" 
    />
  </svg>
);

/**
 * Hug Icon (シンプル・ハート)
 * 余計な装飾を一切排除した、純粋なハートの形です。
 */
export const HugIcon = ({ 
  className = "w-6 h-6", 
  fill = "none", 
  strokeColor = "currentColor" 
}: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill={fill} 
    viewBox="0 0 24 24" 
    strokeWidth={2} 
    stroke={strokeColor} 
    className={className}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" 
    />
  </svg>
);