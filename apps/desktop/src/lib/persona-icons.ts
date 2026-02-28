import { UserCircle, Trophy, Flame } from 'lucide-react';
import type { Persona } from '@norot/shared';

export const PERSONA_ICON_MAP: Record<Persona, React.ElementType> = {
  calm_friend: UserCircle,
  coach: Trophy,
  tough_love: Flame,
};
