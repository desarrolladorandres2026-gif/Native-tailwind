import React from 'react';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const C = {
  p1: '#FF5864',
  p2: '#FF655B',
  p3: '#FD297B',
};

export const WelcomeIllustration = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <Circle cx="60" cy="60" r="50" fill="url(#grad1)" fillOpacity="0.1" />
    <Path d="M40 70C40 70 45 60 60 60C75 60 80 70 80 70" stroke={C.p1} strokeWidth="4" strokeLinecap="round" />
    <Circle cx="45" cy="50" r="4" fill={C.p3} />
    <Circle cx="75" cy="50" r="4" fill={C.p3} />
    <Path d="M90 40L100 30" stroke={C.p2} strokeWidth="3" strokeLinecap="round" />
    <Path d="M20 40L30 30" stroke={C.p2} strokeWidth="3" strokeLinecap="round" />
    <Defs>
      <LinearGradient id="grad1" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <Stop stopColor={C.p1} />
        <Stop offset="1" stopColor={C.p3} />
      </LinearGradient>
    </Defs>
  </Svg>
);

export const BirthdayIllustration = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <Rect x="30" y="40" width="60" height="60" rx="10" stroke={C.p1} strokeWidth="4" />
    <Path d="M30 55H90" stroke={C.p1} strokeWidth="4" />
    <Circle cx="45" cy="35" r="8" fill={C.p2} />
    <Circle cx="75" cy="35" r="8" fill={C.p3} />
    <Path d="M50 75L60 85L75 70" stroke={C.p1} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PhotoIllustration = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <Rect x="25" y="35" width="70" height="55" rx="8" stroke={C.p1} strokeWidth="4" />
    <Circle cx="60" cy="62" r="15" stroke={C.p2} strokeWidth="4" />
    <Rect x="75" y="42" width="12" height="6" rx="2" fill={C.p3} />
    <Circle cx="35" cy="42" r="3" fill={C.p1} />
  </Svg>
);

export const InterestsIllustration = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <Path d="M60 30L70 50L90 55L75 70L80 90L60 80L40 90L45 70L30 55L50 50L60 30Z" fill="url(#grad2)" />
    <Circle cx="20" cy="40" r="10" fill={C.p1} fillOpacity="0.2" />
    <Circle cx="100" cy="80" r="15" fill={C.p3} fillOpacity="0.2" />
    <Defs>
      <LinearGradient id="grad2" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
        <Stop stopColor={C.p1} />
        <Stop offset="1" stopColor={C.p3} />
      </LinearGradient>
    </Defs>
  </Svg>
);

export const SeekingIllustration = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <Path d="M60 95C60 95 20 75 20 45C20 30 35 20 50 25C55 27 60 32 60 32C60 32 65 27 70 25C85 20 100 30 100 45C100 75 60 95 60 95Z" fill="url(#grad3)" />
    <Path d="M45 45L55 55L75 35" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <Defs>
      <LinearGradient id="grad3" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <Stop stopColor={C.p1} />
        <Stop offset="1" stopColor={C.p3} />
      </LinearGradient>
    </Defs>
  </Svg>
);

export const SecurityIllustration = () => (
  <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
    <Rect x="35" y="55" width="50" height="40" rx="6" stroke={C.p2} strokeWidth="4" />
    <Path d="M45 55V45C45 36.7157 51.7157 30 60 30C68.2843 30 75 36.7157 75 45V55" stroke={C.p1} strokeWidth="4" />
    <Circle cx="60" cy="75" r="5" fill={C.p3} />
  </Svg>
);
