/**
 * Noyau d'exercices curés à la main — qualité maximale, instructions en
 * français. Les identifiants de muscles (primaryMuscles/secondaryMuscles)
 * utilisent la taxonomie anglaise standard (chest, quadriceps, lats, ...)
 * pour rester compatibles avec le dataset importé par
 * import-free-exercise-db.ts — indispensable pour que la substitution
 * d'exercice (par recoupement musculaire) fonctionne entre les deux sources.
 */

export interface CuratedExercise {
  name: string;
  category: 'poids_libres' | 'machine' | 'poids_du_corps' | 'cardio';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string;
}

export const CURATED_CORE_EXERCISES: CuratedExercise[] = [
  { name: 'Développé couché barre', category: 'poids_libres', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], instructions: "Allongé sur le banc, pieds ancrés au sol, descendez la barre au niveau du sternum en contrôlant, coudes à environ 45° du buste, puis poussez jusqu'à extension complète sans verrouiller brutalement." },
  { name: 'Squat barre', category: 'poids_libres', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings', 'lower back'], instructions: "Barre sur les trapèzes, pieds largeur d'épaules, descendez en poussant les hanches vers l'arrière jusqu'à ce qu'elles passent sous les genoux, dos neutre, remontez en poussant dans le sol." },
  { name: 'Soulevé de terre', category: 'poids_libres', primaryMuscles: ['lower back'], secondaryMuscles: ['hamstrings', 'glutes', 'lats', 'forearms'], instructions: "Barre au sol contre les tibias, dos neutre, tirez en poussant le sol avec les jambes tout en gardant la barre proche du corps jusqu'à l'extension complète des hanches." },
  { name: 'Développé militaire barre', category: 'poids_libres', primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'chest'], instructions: "Debout, barre au niveau des clavicules, poussez verticalement au-dessus de la tête en gardant le tronc gainé, sans cambrer excessivement le bas du dos." },
  { name: 'Rowing barre buste penché', category: 'poids_libres', primaryMuscles: ['middle back'], secondaryMuscles: ['lats', 'biceps'], instructions: "Buste penché à environ 45°, dos neutre, tirez la barre vers le bas du sternum en serrant les omoplates, contrôlez la descente." },
  { name: 'Développé incliné haltères', category: 'poids_libres', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'], instructions: "Banc incliné à 30-45°, poussez les haltères au-dessus du haut des pectoraux en contrôlant la trajectoire, sans les entrechoquer en haut." },
  { name: 'Curl biceps haltères', category: 'poids_libres', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'], instructions: "Debout, coudes fixes le long du corps, fléchissez en supinant le poignet, contrôlez la descente sans balancer le buste." },
  { name: 'Extension triceps haltère nuque', category: 'poids_libres', primaryMuscles: ['triceps'], secondaryMuscles: [], instructions: "Haltère tenu à deux mains derrière la tête, coudes fixes pointés vers le plafond, tendez les avant-bras en gardant les coudes immobiles." },
  { name: 'Fentes haltères', category: 'poids_libres', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings'], instructions: "Un pas en avant, descendez jusqu'à ce que le genou arrière frôle le sol, buste droit, remontez en poussant sur le talon avant." },
  { name: 'Élévations latérales haltères', category: 'poids_libres', primaryMuscles: ['shoulders'], secondaryMuscles: [], instructions: "Légère flexion des coudes, montez les haltères sur les côtés jusqu'à hauteur d'épaule, contrôlez la descente sans élan." },
  { name: 'Hip thrust barre', category: 'poids_libres', primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'], instructions: "Haut du dos calé sur un banc, barre sur les hanches, poussez les hanches vers le haut jusqu'à l'alignement genoux-hanches-épaules, contractez les fessiers en haut." },
  { name: 'Soulevé de terre roumain haltères', category: 'poids_libres', primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'lower back'], instructions: "Genoux légèrement fléchis et fixes, poussez les hanches vers l'arrière en gardant les haltères proches des jambes, jusqu'à sentir l'étirement des ischios." },
  { name: 'Presse à cuisses', category: 'machine', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], instructions: "Pieds largeur d'épaules sur le plateau, descendez jusqu'à 90° de flexion de genou, poussez sans verrouiller complètement en haut." },
  { name: 'Leg curl allongé', category: 'machine', primaryMuscles: ['hamstrings'], secondaryMuscles: [], instructions: "Allongé, tibias sous le rouleau, fléchissez les genoux en amenant les talons vers les fessiers, contrôlez le retour." },
  { name: 'Leg extension', category: 'machine', primaryMuscles: ['quadriceps'], secondaryMuscles: [], instructions: "Assis, tibias derrière le rouleau, tendez les genoux jusqu'à extension complète, contrôlez la descente." },
  { name: 'Tirage vertical (lat pulldown)', category: 'machine', primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'middle back'], instructions: "Prise large, tirez la barre vers le haut de la poitrine en ouvrant la cage thoracique, remontez en contrôlant l'étirement." },
  { name: 'Rowing poulie basse', category: 'machine', primaryMuscles: ['middle back'], secondaryMuscles: ['lats', 'biceps'], instructions: "Assis, dos droit, tirez la poignée vers le bas du sternum en serrant les omoplates, laissez revenir en contrôlant l'étirement." },
  { name: 'Extension triceps à la poulie', category: 'machine', primaryMuscles: ['triceps'], secondaryMuscles: [], instructions: "Coudes fixes au corps, tendez les avant-bras vers le bas jusqu'à extension complète, remontez en contrôlant." },
  { name: 'Curl biceps à la poulie', category: 'machine', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'], instructions: "Coudes fixes, fléchissez en tirant la barre vers le haut, contrôlez la descente jusqu'à extension complète." },
  { name: 'Tractions pronation', category: 'poids_du_corps', primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'middle back'], instructions: "Prise large pronation, tirez le corps jusqu'à ce que le menton dépasse la barre, contrôlez la descente jusqu'à extension complète des bras." },
  { name: 'Dips', category: 'poids_du_corps', primaryMuscles: ['triceps'], secondaryMuscles: ['chest', 'shoulders'], instructions: "Bras tendus au départ, descendez en fléchissant les coudes jusqu'à 90°, poussez jusqu'à extension complète sans verrouiller brutalement." },
  { name: 'Pompes', category: 'poids_du_corps', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'], instructions: "Corps gainé et aligné, descendez jusqu'à ce que la poitrine frôle le sol, poussez jusqu'à extension complète des bras." },
  { name: 'Gainage planche', category: 'poids_du_corps', primaryMuscles: ['abdominals'], secondaryMuscles: ['lower back'], instructions: "Appui sur avant-bras et pointes de pieds, corps aligné de la tête aux talons, tenez la position sans laisser tomber les hanches." },
  { name: 'Rameur', category: 'cardio', primaryMuscles: ['middle back'], secondaryMuscles: ['hamstrings', 'quadriceps'], instructions: "Poussez avec les jambes, puis tirez avec le dos et les bras, revenez dans l'ordre inverse en gardant un rythme régulier." },
  { name: 'Corde à sauter', category: 'cardio', primaryMuscles: ['calves'], secondaryMuscles: ['shoulders'], instructions: "Sautez sur l'avant des pieds avec des rotations de poignet, gardez un rythme régulier et les genoux légèrement fléchis." },
];
