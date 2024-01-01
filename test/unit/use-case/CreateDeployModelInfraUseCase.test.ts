import {describe, expect, jest, test} from "@jest/globals";
import {mockDeep} from "jest-mock-extended";
import {faker} from "@faker-js/faker";

import {
    CreateDeployModelInfraDtoInput, CreateDeployModelInfraDtoOutput,
    CreateDeployModelInfraUseCase
} from "../../../src/use-case/CreateDeployModelInfraUseCase";
import {DeployModelRepository} from "../../../src/repository/DeployModelRepository";
import {randomUUID} from "crypto";
import {DeployModelDoesNotExistException} from "../../../src/exception/DeployModelDoesNotExistException";
import {DeployModelEntity} from "../../../src/entity/DeployModelEntity";
import {AwsCredentialsConfigurationMissingException} from "../../../src/exception/AwsCredentialsConfigurationMissingException"

describe("CreateDeployModelInfraUseCase", () => {
    const deployModelRepository = mockDeep<DeployModelRepository>()
    const createDeployModelInfraUseCase = new CreateDeployModelInfraUseCase(deployModelRepository)

    const deployModelId = randomUUID().toString()
    const createDeployModelInfraDtoInput = new CreateDeployModelInfraDtoInput(deployModelId)

    const ownerEmail = faker.internet.email()
    const deployModelName = faker.internet.domainName()
    const deployModelEntity = new DeployModelEntity(
        deployModelId,
        deployModelName,
        ownerEmail,
        "",
        `${ownerEmail}-${deployModelId}-awsCredentials`,
    )

    const createDeployModelInfraDtoOutput = new CreateDeployModelInfraDtoOutput(deployModelId)

    describe("execute", () => {
        test("should throw DeployModelDoesNotExistException", async () => {
            jest.spyOn(deployModelRepository, "findDeployModelById").mockResolvedValue(null)

            await expect(createDeployModelInfraUseCase.execute(createDeployModelInfraDtoInput)).rejects.toThrow(DeployModelDoesNotExistException)
            expect(deployModelRepository.findDeployModelById).toBeCalledWith({
                deployModelId: deployModelId
            })
        })

        test("should throw AwsCredentialsConfigurationMissingException", async () => {
            const deployModelEntity = new DeployModelEntity(
                deployModelId,
                deployModelName,
                ownerEmail,
                "",
                "",
            )
            jest.spyOn(deployModelRepository, "findDeployModelById").mockResolvedValue(deployModelEntity)

            await expect(createDeployModelInfraUseCase.execute(createDeployModelInfraDtoInput)).rejects.toThrow(AwsCredentialsConfigurationMissingException)
            expect(deployModelRepository.findDeployModelById).toBeCalledWith({
                deployModelId: deployModelId
            })
        })

        test("should create a deploy model infra", async () => {
            jest.spyOn(deployModelRepository, "findDeployModelById").mockResolvedValue(deployModelEntity)

            const output = await createDeployModelInfraUseCase.execute(createDeployModelInfraDtoInput)

            expect(deployModelRepository.findDeployModelById).toBeCalledWith({
                deployModelId: deployModelId
            })
            expect(output).toEqual(createDeployModelInfraDtoOutput)
        })
    })
})