import { Test, TestingModule } from '@nestjs/testing';
import { ResultService } from './result.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Result } from '../common/entities/result.entity';
import { Repository } from 'typeorm';
import { ResultDto } from './dtos/result.dto';
import { BadRequestException } from '@nestjs/common';
import { RecommendationTypeEnum } from '../common/consts/types.const';

describe('ResultService', () => {
  let service: ResultService;
  let resultRepository: Repository<Result>;

  // 모의 리포지토리 정의
  const mockResultRepository = {
    find: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultService,
        {
          provide: getRepositoryToken(Result),
          useValue: mockResultRepository,
        },
      ],
    }).compile();

    service = module.get<ResultService>(ResultService);
    resultRepository = module.get<Repository<Result>>(
      getRepositoryToken(Result),
    );
  });

  afterEach(() => {
    jest.clearAllMocks(); // 모든 모킹된 함수 초기화
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 전체 price 범위 테스트 (1,000원 이상 ~ 10,000,000원 미만 범위 초과 시 에러)
  it('should throw an error if overall price is out of range', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 10000000, // 10,000,000 초과
      type: RecommendationTypeEnum.MORE,
      recommendedItems: [{ name: '추천1', price: 1000, iconUrl: 'icon-url' }],
    };

    await expect(service.saveResult(resultDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw an error if overall price is less than 1,000', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 999, // 1,000 미만
      type: RecommendationTypeEnum.EXPENSIVE,
      recommendedItems: [{ name: '추천1', price: 1000, iconUrl: 'icon-url' }],
    };

    await expect(service.saveResult(resultDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 추천 품목의 개수 초과 테스트
  it('should throw an error if recommended items exceed limit for MORE', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 50000,
      type: RecommendationTypeEnum.MORE,
      recommendedItems: [
        { name: '추천1', price: 1000, iconUrl: 'icon-url' },
        { name: '추천2', price: 2000, iconUrl: 'icon-url' },
        { name: '추천3', price: 3000, iconUrl: 'icon-url' },
        { name: '추천4', price: 4000, iconUrl: 'icon-url' }, // 4개, 최대 3개까지 가능
      ],
    };

    await expect(service.saveResult(resultDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 추천 품목 가격이 더 큰 경우 (MORE)
  it('should throw an error if recommended item price is greater than the main price for MORE', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 5000,
      type: RecommendationTypeEnum.MORE,
      recommendedItems: [
        { name: '추천1', price: 6000, iconUrl: 'icon-url' }, // 가격이 더 큼
      ],
    };

    await expect(service.saveResult(resultDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // 추천 품목 가격이 더 작은 경우 (EXPENSIVE)
  it('should throw an error if recommended item price is lower than the main price for EXPENSIVE', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 5000,
      type: RecommendationTypeEnum.EXPENSIVE,
      recommendedItems: [
        { name: '추천1', price: 4000, iconUrl: 'icon-url' }, // 가격이 더 작음
      ],
    };

    await expect(service.saveResult(resultDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // MORE 타입에서 추천 품목 가격이 1원부터 999,999,999원 사이일 때 정상 동작 테스트
  it('should allow recommended item price from 1 to 999,999,999 for MORE', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 50000,
      type: RecommendationTypeEnum.MORE,
      recommendedItems: [
        { name: '추천1', price: 1, iconUrl: 'icon-url' },
        { name: '추천2', price: 49999, iconUrl: 'icon-url' },
      ],
    };

    mockResultRepository.save.mockResolvedValue(resultDto);

    const result = await service.saveResult(resultDto);

    expect(result).toEqual(resultDto);
    expect(mockResultRepository.save).toHaveBeenCalledTimes(1);
  });

  // 조건을 모두 만족하는 경우 정상 저장 테스트
  it('should save result when all conditions are met', async () => {
    const resultDto: ResultDto = {
      name: '테스트',
      price: 10000,
      type: RecommendationTypeEnum.MORE,
      recommendedItems: [{ name: '추천1', price: 5000, iconUrl: 'icon-url' }],
    };

    mockResultRepository.save.mockResolvedValue(resultDto);

    const result = await service.saveResult(resultDto);

    expect(result).toEqual(resultDto);
    expect(mockResultRepository.save).toHaveBeenCalledTimes(1);
  });
});
