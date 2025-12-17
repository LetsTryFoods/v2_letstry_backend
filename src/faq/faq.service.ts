import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FAQ, FAQDocument, FAQStatus, FAQCategory } from './faq.schema';
import { CreateFAQInput, UpdateFAQInput, FAQFilterInput } from './faq.input';

@Injectable()
export class FAQService {
  constructor(
    @InjectModel(FAQ.name) private faqModel: Model<FAQDocument>,
  ) {}

  // Find all FAQs with optional filters
  async findAll(filter?: FAQFilterInput): Promise<FAQ[]> {
    const query: any = {};

    if (filter?.category) {
      query.category = filter.category;
    }

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.searchQuery) {
      const searchRegex = new RegExp(filter.searchQuery, 'i');
      query.$or = [
        { question: searchRegex },
        { answer: searchRegex },
      ];
    }

    return this.faqModel.find(query).sort({ order: 1, createdAt: -1 }).exec();
  }

  // Find active FAQs only (for public display)
  async findActive(category?: FAQCategory): Promise<FAQ[]> {
    const query: any = { status: FAQStatus.ACTIVE };

    if (category) {
      query.category = category;
    }

    return this.faqModel.find(query).sort({ order: 1 }).exec();
  }

  // Find single FAQ by ID
  async findById(id: string): Promise<FAQ> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return faq;
  }

  // Create new FAQ
  async create(input: CreateFAQInput): Promise<FAQ> {
    // If no order specified, get the max order and add 1
    if (input.order === undefined || input.order === 0) {
      const maxOrderFAQ = await this.faqModel
        .findOne()
        .sort({ order: -1 })
        .exec();
      input.order = maxOrderFAQ ? maxOrderFAQ.order + 1 : 1;
    }

    const newFAQ = new this.faqModel(input);
    return newFAQ.save();
  }

  // Update FAQ
  async update(input: UpdateFAQInput): Promise<FAQ> {
    const { id, ...updateData } = input;
    
    const updatedFAQ = await this.faqModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedFAQ) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    return updatedFAQ;
  }

  // Delete FAQ
  async delete(id: string): Promise<boolean> {
    const result = await this.faqModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }
    return true;
  }

  // Toggle FAQ status
  async toggleStatus(id: string): Promise<FAQ> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    faq.status = faq.status === FAQStatus.ACTIVE ? FAQStatus.INACTIVE : FAQStatus.ACTIVE;
    return faq.save();
  }

  // Reorder FAQs
  async reorder(ids: string[]): Promise<boolean> {
    const updates = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { order: index + 1 },
      },
    }));

    await this.faqModel.bulkWrite(updates);
    return true;
  }

  // Get FAQ stats
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
  }> {
    const faqs = await this.faqModel.find().exec();
    
    const stats = {
      total: faqs.length,
      active: faqs.filter(f => f.status === FAQStatus.ACTIVE).length,
      inactive: faqs.filter(f => f.status === FAQStatus.INACTIVE).length,
      byCategory: {} as Record<string, number>,
    };

    Object.values(FAQCategory).forEach(category => {
      stats.byCategory[category] = faqs.filter(f => f.category === category).length;
    });

    return stats;
  }
}
