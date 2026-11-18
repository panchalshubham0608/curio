import { getPreferredFormatsForMix } from '../../domain/user/UserPreferences';
import {
  UserPreferencesSchema,
  type ContentCategory,
  type ContentMix,
  type ContentRegion,
  type SessionDurationMinutes,
  type UserPreferences,
} from '../../shared/validation/contentSchemas';
import type { InteractionRepository, UserPreferencesRepository } from '../ports';

export interface UpdatePreferencesPatch {
  displayName?: string;
  region?: ContentRegion;
  interests?: ContentCategory[];
  topicKeywords?: string[];
  excludedTopics?: string[];
  preferredMix?: ContentMix;
  defaultSessionDuration?: SessionDurationMinutes;
  onboardingCompleted?: boolean;
}

export class GetPreferencesUseCase {
  private readonly preferencesRepository: UserPreferencesRepository;

  constructor(preferencesRepository: UserPreferencesRepository) {
    this.preferencesRepository = preferencesRepository;
  }

  public async execute(userId: string): Promise<UserPreferences> {
    return this.preferencesRepository.get(userId);
  }
}

export class UpdatePreferencesUseCase {
  private readonly preferencesRepository: UserPreferencesRepository;

  constructor(preferencesRepository: UserPreferencesRepository) {
    this.preferencesRepository = preferencesRepository;
  }

  public async execute(
    userId: string,
    patch: UpdatePreferencesPatch
  ): Promise<UserPreferences> {
    const current = await this.preferencesRepository.get(userId);
    const nextMix = patch.preferredMix ?? current.preferredMix;
    const nextInterests =
      patch.interests && patch.interests.length > 0 ? patch.interests : current.interests;

    const updated = UserPreferencesSchema.parse({
      ...current,
      displayName:
        patch.displayName !== undefined
          ? patch.displayName.trim() || undefined
          : current.displayName,
      region: patch.region ?? current.region ?? 'global',
      interests: nextInterests,
      topicKeywords: patch.topicKeywords ?? current.topicKeywords,
      excludedTopics: patch.excludedTopics ?? current.excludedTopics,
      preferredMix: nextMix,
      preferredFormats: getPreferredFormatsForMix(nextMix),
      defaultSessionDuration: patch.defaultSessionDuration ?? current.defaultSessionDuration,
      onboardingCompleted: patch.onboardingCompleted ?? current.onboardingCompleted,
      updatedAt: new Date().toISOString(),
    });

    await this.preferencesRepository.save(updated);
    return updated;
  }
}

export class ResetPersonalizationUseCase {
  private readonly preferencesRepository: UserPreferencesRepository;
  private readonly interactionRepository: InteractionRepository;

  constructor(
    preferencesRepository: UserPreferencesRepository,
    interactionRepository: InteractionRepository
  ) {
    this.preferencesRepository = preferencesRepository;
    this.interactionRepository = interactionRepository;
  }

  public async execute(userId: string): Promise<UserPreferences> {
    await this.interactionRepository.clearForUser(userId);
    return this.preferencesRepository.reset(userId);
  }
}
