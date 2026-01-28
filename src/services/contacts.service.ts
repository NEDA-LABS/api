/**
 * Contacts Service
 * Handles all contact-related business logic
 */

import { prisma } from '../repositories/prisma.js';
import { logger } from '../utils/logger.js';

// Types
export interface ContactFilters {
  search?: string;
  country?: string;
  favorite?: boolean;
  isNedaPayUser?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateContactData {
  name: string;
  nickname?: string;
  country?: string;
  notes?: string;
  linkedUserId?: string | null;
  isNedaPayUser?: boolean;
  favorite?: boolean;
  bankAccounts?: CreateBankAccountData[];
  phoneNumbers?: CreatePhoneNumberData[];
  cryptoAddresses?: CreateCryptoAddressData[];
}

export interface UpdateContactData {
  name?: string;
  nickname?: string;
  country?: string;
  notes?: string;
  linkedUserId?: string | null;
  isNedaPayUser?: boolean;
  favorite?: boolean;
}

export interface CreateBankAccountData {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string;
  currency?: string;
  isPrimary?: boolean;
  label?: string;
}

export interface CreatePhoneNumberData {
  phoneNumber: string;
  provider?: string;
  country?: string;
  isPrimary?: boolean;
  label?: string;
}

export interface CreateCryptoAddressData {
  address: string;
  ensName?: string;
  chainId?: number;
  isPrimary?: boolean;
  label?: string;
}

// Include relations for contact queries
const contactInclude = {
  bankAccounts: true,
  phoneNumbers: true,
  cryptoAddresses: true,
  linkedUser: {
    select: {
      id: true,
      name: true,
      email: true,
      wallet: true,
      isActive: true,
    }
  }
};

class ContactsService {
  /**
   * Get all contacts for a user with optional filters
   */
  async getContacts(userId: string, filters: ContactFilters = {}) {
    const { search, country, favorite, isNedaPayUser, limit = 50, offset = 0 } = filters;

    // Build where clause
    const where: any = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (country) where.country = country;
    if (favorite !== undefined) where.favorite = favorite;
    if (isNedaPayUser !== undefined) where.isNedaPayUser = isNedaPayUser;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: contactInclude,
        orderBy: [
          { favorite: 'desc' },
          { lastUsed: 'desc' },
          { name: 'asc' }
        ],
        take: limit,
        skip: offset,
      }),
      prisma.contact.count({ where })
    ]);

    return {
      contacts,
      total,
      hasMore: offset + contacts.length < total,
    };
  }

  /**
   * Get a single contact by ID
   */
  async getContact(userId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId,
      },
      include: contactInclude,
    });

    return contact;
  }

  /**
   * Create a new contact
   */
  async createContact(userId: string, data: CreateContactData) {
    const {
      name,
      nickname,
      country,
      notes,
      linkedUserId,
      isNedaPayUser = false,
      favorite = false,
      bankAccounts = [],
      phoneNumbers = [],
      cryptoAddresses = []
    } = data;

    const contact = await prisma.contact.create({
      data: {
        userId,
        name,
        nickname,
        country,
        notes,
        linkedUserId,
        isNedaPayUser,
        favorite,
        bankAccounts: {
          create: bankAccounts.map((acc) => ({
            accountNumber: acc.accountNumber,
            accountName: acc.accountName,
            bankName: acc.bankName,
            bankCode: acc.bankCode,
            currency: acc.currency || 'USD',
            isPrimary: acc.isPrimary || false,
            label: acc.label,
          }))
        },
        phoneNumbers: {
          create: phoneNumbers.map((phone) => ({
            phoneNumber: phone.phoneNumber,
            provider: phone.provider,
            country: phone.country,
            isPrimary: phone.isPrimary || false,
            label: phone.label,
          }))
        },
        cryptoAddresses: {
          create: cryptoAddresses.map((addr) => ({
            address: addr.address,
            ensName: addr.ensName,
            chainId: addr.chainId,
            isPrimary: addr.isPrimary || false,
            label: addr.label,
          }))
        }
      },
      include: contactInclude,
    });

    logger.info('Contact created', { userId, contactId: contact.id, name });
    return contact;
  }

  /**
   * Update a contact
   */
  async updateContact(userId: string, contactId: string, data: UpdateContactData) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return null;
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nickname !== undefined && { nickname: data.nickname }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.linkedUserId !== undefined && { linkedUserId: data.linkedUserId }),
        ...(data.isNedaPayUser !== undefined && { isNedaPayUser: data.isNedaPayUser }),
        ...(data.favorite !== undefined && { favorite: data.favorite }),
      },
      include: contactInclude,
    });

    logger.info('Contact updated', { userId, contactId });
    return contact;
  }

  /**
   * Delete a contact
   */
  async deleteContact(userId: string, contactId: string) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    logger.info('Contact deleted', { userId, contactId });
    return true;
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: string, contactId: string) {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return null;
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: { favorite: !existing.favorite },
      include: contactInclude,
    });

    return contact;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(userId: string, contactId: string) {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return null;
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: { lastUsed: new Date() },
      include: contactInclude,
    });

    return contact;
  }

  /**
   * Add a bank account to a contact
   */
  async addBankAccount(userId: string, contactId: string, data: CreateBankAccountData) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return null;
    }

    const bankAccount = await prisma.contactBankAccount.create({
      data: {
        contactId,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        currency: data.currency || 'USD',
        isPrimary: data.isPrimary || false,
        label: data.label,
      },
    });

    return bankAccount;
  }

  /**
   * Remove a bank account from a contact
   */
  async removeBankAccount(userId: string, contactId: string, bankAccountId: string) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.contactBankAccount.delete({
      where: { id: bankAccountId },
    });

    return true;
  }

  /**
   * Add a phone number to a contact
   */
  async addPhoneNumber(userId: string, contactId: string, data: CreatePhoneNumberData) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return null;
    }

    const phoneNumber = await prisma.contactPhoneNumber.create({
      data: {
        contactId,
        phoneNumber: data.phoneNumber,
        provider: data.provider,
        country: data.country,
        isPrimary: data.isPrimary || false,
        label: data.label,
      },
    });

    return phoneNumber;
  }

  /**
   * Remove a phone number from a contact
   */
  async removePhoneNumber(userId: string, contactId: string, phoneNumberId: string) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.contactPhoneNumber.delete({
      where: { id: phoneNumberId },
    });

    return true;
  }

  /**
   * Add a crypto address to a contact
   */
  async addCryptoAddress(userId: string, contactId: string, data: CreateCryptoAddressData) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return null;
    }

    const cryptoAddress = await prisma.contactCryptoAddress.create({
      data: {
        contactId,
        address: data.address,
        ensName: data.ensName,
        chainId: data.chainId,
        isPrimary: data.isPrimary || false,
        label: data.label,
      },
    });

    return cryptoAddress;
  }

  /**
   * Remove a crypto address from a contact
   */
  async removeCryptoAddress(userId: string, contactId: string, cryptoAddressId: string) {
    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.contactCryptoAddress.delete({
      where: { id: cryptoAddressId },
    });

    return true;
  }

  /**
   * Search for NedaPay users to link as contacts
   */
  async searchUsers(query: string, type: 'wallet' | 'email' | 'name') {
    const where: any = {};

    switch (type) {
      case 'wallet':
        where.wallet = { contains: query, mode: 'insensitive' };
        break;
      case 'email':
        where.email = { contains: query, mode: 'insensitive' };
        break;
      case 'name':
        where.name = { contains: query, mode: 'insensitive' };
        break;
    }

    const users = await prisma.user.findMany({
      where: {
        ...where,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        wallet: true,
      },
      take: 10,
    });

    return users;
  }
}

export const contactsService = new ContactsService();
