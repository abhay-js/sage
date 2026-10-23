import Svg, { Path, Circle, Rect, G, Ellipse } from 'react-native-svg';
import { sageColors } from '../../lib/theme';
import art from '../../lib/mountainPalette';
export function MountainArt({ tall = false }: { tall?: boolean }) {
 return <Svg width="100%" height="100%" viewBox={tall ? '0 0 430 1700' : '0 0 380 150'} preserveAspectRatio="none">{tall ? <>
        <Rect width="430" height="1500" fill={art.art13} />
        <Rect y="1500" width="430" height="200" fill={art.art13} />
        <Circle cx="364" cy="96" r="35" fill={art.art19} />
        <G fill={art.art21} opacity=".82">
          <Path d="M11 221h87c0-17-14-30-32-28-6-15-28-17-36-3-16-4-24 10-19 31Z" />
          <Path d="M341 466h83c-2-14-14-22-27-18-8-17-32-15-38 3-11-2-20 5-18 15Z" />
          <Path d="M2 948h78c0-13-12-22-25-19-7-15-29-14-35 2-11-2-19 5-18 17Z" />
        </G>

        <Path d="M86 170 44 257l19 92-30 115 38 112-24 119 28 117-33 112 31 131-24 113 30 124-25 130 38 148 284 1 27-130-29-127 34-139-28-120 35-125-31-115 28-118-31-121 30-111-35-107-3-61Z" fill={art.art26} />
        <Path d="m86 170 91 82-114 97-30 115 155-26-117 138-24 119 150-42-122 159-33 112 148-39-117 170-24 113 143-45-113 169-25 130 128-35-90 183 284 1 27-130-133-54 162-73-29-127-141 19 175-158-28-120-142 45 177-170-31-115-134 54 162-172-31-121-137 49 167-160-35-107-129 40 126-101-3-61Z" fill={art.art25} />
        <G fill={art.art27}>
          <Path d="m86 170 91 82-114 97Z" /><Path d="m33 464 155-26L71 576Z" />
          <Path d="m47 695 150-42L75 812Z" /><Path d="m42 924 148-39-117 170Z" />
          <Path d="m49 1168 143-45-113 169Z" /><Path d="m54 1422 128-35-90 183Z" />
          <Path d="m403 1421-133-54 162-73Z" /><Path d="m408 1174-141 19 175-158Z" />
          <Path d="m415 929-142 45 177-170Z" /><Path d="m412 698-134 54 162-172Z" />
          <Path d="m411 466-137 49 167-160Z" /><Path d="m406 251-129 40 126-101Z" />
        </G>
        <G fill="none" stroke={art.art23} strokeWidth="3" strokeLinecap="round" opacity=".7">
          <Path d="m141 330 31 23-20 39 33 25" /><Path d="m292 408-28 38 27 37-36 44" />
          <Path d="m135 726 30 31-23 47" /><Path d="m301 846-32 37 29 45-39 34" />
          <Path d="m146 1062 34 31-31 50" /><Path d="m293 1248-37 41 35 42" />
          <Path d="m157 1450 27 32-18 40" />
        </G>
        <G fill={art.art28} stroke={art.art24} strokeWidth="2">
          <Ellipse cx="210" cy="328" rx="12" ry="6" transform="rotate(-18 210 328)" />
          <Ellipse cx="286" cy="557" rx="10" ry="6" transform="rotate(24 286 557)" />
          <Ellipse cx="158" cy="664" rx="11" ry="6" transform="rotate(-22 158 664)" />
          <Ellipse cx="251" cy="764" rx="12" ry="6" transform="rotate(16 251 764)" />
          <Ellipse cx="175" cy="884" rx="11" ry="6" transform="rotate(-15 175 884)" />
          <Ellipse cx="279" cy="983" rx="12" ry="6" transform="rotate(21 279 983)" />
          <Ellipse cx="147" cy="1086" rx="10" ry="6" transform="rotate(-25 147 1086)" />
          <Ellipse cx="245" cy="1195" rx="12" ry="6" transform="rotate(12 245 1195)" />
          <Ellipse cx="181" cy="1327" rx="11" ry="6" transform="rotate(-18 181 1327)" />
          <Ellipse cx="284" cy="1440" rx="12" ry="6" transform="rotate(20 284 1440)" />
        </G>
        <G fill={art.art22}>
          <Path d="M61 358c16-14 36-12 49 0H61Z" /><Path d="M324 610c17-15 37-12 49 1h-49Z" />
          <Path d="M48 1058c17-14 37-12 51 1H48Z" /><Path d="M329 1320c15-13 34-11 47 0h-47Z" />
        </G>
      </> : <><Rect width="380" height="150" fill={sageColors.sky} /><Circle cx="315" cy="28" r="18" fill={art.art19} />
            <Path d="M0 125 72 54l50 53 44-73 67 91 53-66 94 67v24H0Z" fill={art.art3} />
            <Path d="m130 125 37-90 67 90Z" fill={art.art1} />
            <Path d="m156 62 11-27 17 23-12-5Z" fill={art.art18} />
            <Path d="M0 128c83-19 138 13 212-1s114-3 168 1v22H0Z" fill={art.art10} />
            <Path d="M43 150c32-18 75-10 109-21 35-11 50-29 79-29 28 0 48 16 81 8" fill="none" stroke={art.art15} strokeWidth="8" />
          </>}</Svg>;
}
