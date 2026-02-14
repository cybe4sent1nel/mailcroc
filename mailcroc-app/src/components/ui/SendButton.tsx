"use client";

import React from 'react';
import styled from 'styled-components';

interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
  text?: string;
}

const SendButton: React.FC<SendButtonProps> = ({ onClick, disabled, text = "send" }) => {
  return (
    <StyledWrapper>
      <button className="Btn-Container" onClick={onClick} disabled={disabled}>
        <span className="text">{text}</span>
        <span className="icon-Container">
          <svg width={16} height={19} viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="1.61321" cy="1.61321" r="1.5" fill="black" />
            <circle cx="5.73583" cy="1.61321" r="1.5" fill="black" />
            <circle cx="5.73583" cy="5.5566" r="1.5" fill="black" />
            <circle cx="9.85851" cy="5.5566" r="1.5" fill="black" />
            <circle cx="9.85851" cy="9.5" r="1.5" fill="black" />
            <circle cx="13.9811" cy="9.5" r="1.5" fill="black" />
            <circle cx="5.73583" cy="13.4434" r="1.5" fill="black" />
            <circle cx="9.85851" cy="13.4434" r="1.5" fill="black" />
            <circle cx="1.61321" cy="17.3868" r="1.5" fill="black" />
            <circle cx="5.73583" cy="17.3868" r="1.5" fill="black" />
          </svg>
        </span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .Btn-Container {
    display: flex;
    width: 170px;
    height: 48px;
    background-color: #89f290;
    border-radius: 40px;
    box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.1);
    justify-content: space-between;
    align-items: center;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0 5px 0 20px;
    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        filter: grayscale(0.5);
    }
    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.15);
        background-color: #7ae181;
    }
  }
  .icon-Container {
    width: 38px;
    height: 38px;
    background-color: #f59aff;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 3px solid #1d2129;
  }
  .text {
    color: #1d2129;
    font-size: 1.1em;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: lowercase;
  }
  .icon-Container svg {
    transition-duration: 1.5s;
  }
  .Btn-Container:hover:not(:disabled) .icon-Container svg {
    transition-duration: 1.5s;
    animation: arrow 1s linear infinite;
  }
  @keyframes arrow {
    0% {
      opacity: 0;
      margin-left: 0px;
    }
    100% {
      opacity: 1;
      margin-left: 10px;
    }
  }`;

export default SendButton;
