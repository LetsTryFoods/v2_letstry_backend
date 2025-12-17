import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SocialMediaLinkInput {
  @Field()
  platform: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  iconUrl?: string;
}

@InputType()
export class QuickLinkInput {
  @Field()
  label: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  order?: number;

  @Field({ nullable: true })
  isActive?: boolean;
}

@InputType()
export class CreateFooterDetailInput {
  // Styling
  @Field({ nullable: true })
  backgroundColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  linkColor?: string;

  @Field({ nullable: true })
  linkHoverColor?: string;

  // Logo
  @Field({ nullable: true })
  logoUrl?: string;

  // Social Media Section
  @Field({ nullable: true })
  socialMediaTitle?: string;

  @Field(() => [SocialMediaLinkInput], { nullable: true })
  socialMediaLinks?: SocialMediaLinkInput[];

  // Quick Links Section
  @Field({ nullable: true })
  quickLinksTitle?: string;

  @Field(() => [QuickLinkInput], { nullable: true })
  quickLinks?: QuickLinkInput[];

  // Contact Section
  @Field({ nullable: true })
  contactTitle?: string;

  @Field()
  companyName: string;

  @Field({ nullable: true })
  cin?: string;

  @Field()
  address: string;

  @Field()
  email: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  exportEmailLabel?: string;

  @Field({ nullable: true })
  exportEmail?: string;

  // Copyright
  @Field({ nullable: true })
  copyrightText?: string;

  // Status
  @Field({ nullable: true })
  isActive?: boolean;
}

@InputType()
export class UpdateFooterDetailInput {
  // Styling
  @Field({ nullable: true })
  backgroundColor?: string;

  @Field({ nullable: true })
  textColor?: string;

  @Field({ nullable: true })
  linkColor?: string;

  @Field({ nullable: true })
  linkHoverColor?: string;

  // Logo
  @Field({ nullable: true })
  logoUrl?: string;

  // Social Media Section
  @Field({ nullable: true })
  socialMediaTitle?: string;

  @Field(() => [SocialMediaLinkInput], { nullable: true })
  socialMediaLinks?: SocialMediaLinkInput[];

  // Quick Links Section
  @Field({ nullable: true })
  quickLinksTitle?: string;

  @Field(() => [QuickLinkInput], { nullable: true })
  quickLinks?: QuickLinkInput[];

  // Contact Section
  @Field({ nullable: true })
  contactTitle?: string;

  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  cin?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  exportEmailLabel?: string;

  @Field({ nullable: true })
  exportEmail?: string;

  // Copyright
  @Field({ nullable: true })
  copyrightText?: string;

  // Status
  @Field({ nullable: true })
  isActive?: boolean;
}
