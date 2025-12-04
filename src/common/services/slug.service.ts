import { Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async generateUniqueSlug(
    baseSlug: string,
    checkExistence: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await checkExistence(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
