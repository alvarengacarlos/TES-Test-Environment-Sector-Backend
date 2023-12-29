import {PrismaClient} from "@prisma/client";

import {
    DeployModelRepository, FindDeployModelByIdInput,
    SaveBackendSourceCodeInput,
    SaveDeployModelInput,
    SaveFrontendSourceCodeInput
} from "./DeployModelRepository";
import {Logger} from "../util/Logger";
import {DeployModelEntity} from "../entity/DeployModelEntity";
import {DatabaseException} from "../exception/DatabaseException";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {S3Exception} from "../exception/S3Exception";

export class DeployModelRepositoryImpl implements DeployModelRepository {

    constructor(
        private readonly prismaClient: PrismaClient,
        private readonly s3Client: S3Client
    ) {
    }

    async saveDeployModel(saveDeployModelInput: SaveDeployModelInput): Promise<DeployModelEntity> {
        try {
            Logger.info(this.constructor.name, this.saveDeployModel.name, "saving deploy model")
            await this.prismaClient.$connect()
            const result = await this.prismaClient.deployModel.create({
                data: saveDeployModelInput
            })

            Logger.info(this.constructor.name, this.saveDeployModel.name, "deploy model saved with success")
            return new DeployModelEntity(
                result.id,
                result.deployModelName,
                result.deployModelType,
                result.databaseType,
                result.executionEnvironment,
                result.ownerEmail,
                result.frontendSourceCodePath,
                result.backendSourceCodePath,
                result.accessKeyIdPath,
                result.secretAccessKeyPath
            )


        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveDeployModel.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }

    async findDeployModelById(findDeployModelByIdInput: FindDeployModelByIdInput): Promise<DeployModelEntity | null> {
        try {
            Logger.info(this.constructor.name, this.findDeployModelById.name, "finding deploy model")
            await this.prismaClient.$connect()
            const result = await this.prismaClient.deployModel.findUnique({
                where: {id: findDeployModelByIdInput.deployModelId}
            })

            Logger.info(this.constructor.name, this.findDeployModelById.name, "find executed with success")

            if (!result) {
                return null
            }

            return new DeployModelEntity(
                result.id,
                result.deployModelName,
                result.deployModelType,
                result.databaseType,
                result.executionEnvironment,
                result.ownerEmail,
                result.frontendSourceCodePath,
                result.backendSourceCodePath,
                result.accessKeyIdPath,
                result.secretAccessKeyPath
            )

        } catch (error: any) {
            Logger.error(this.constructor.name, this.findDeployModelById.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }

    async saveFrontendSourceCode(saveFrontendSourceCodeInput: SaveFrontendSourceCodeInput): Promise<DeployModelEntity> {
        const frontendSourceCodePath = await this.saveSourceCode(
            saveFrontendSourceCodeInput.ownerEmail,
            saveFrontendSourceCodeInput.deployModelId,
            saveFrontendSourceCodeInput.codeType,
            saveFrontendSourceCodeInput.bufferedSourceCodeFile
        )

        try {
            Logger.info(this.constructor.name, this.saveFrontendSourceCode.name, "saving source code path")
            await this.prismaClient.$connect()
            const result = await this.prismaClient.deployModel.update({
                where: {id: saveFrontendSourceCodeInput.deployModelId},
                data: {
                    frontendSourceCodePath: frontendSourceCodePath
                }
            })

            Logger.info(this.constructor.name, this.saveFrontendSourceCode.name, "source code saved with success")
            return new DeployModelEntity(
                result.id,
                result.deployModelName,
                result.deployModelType,
                result.databaseType,
                result.executionEnvironment,
                result.ownerEmail,
                result.frontendSourceCodePath,
                result.backendSourceCodePath,
                result.accessKeyIdPath,
                result.secretAccessKeyPath
            )

        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveFrontendSourceCode.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }

    private async saveSourceCode(ownerEmail: string, deployModelId: string, codeType: string, bufferedSourceCodeFile: Buffer): Promise<string> {
        try {
            Logger.info(this.constructor.name, this.saveSourceCode.name, "executing put object command")
            const sourceCodePath = `sourceCode/${ownerEmail}-${deployModelId}-${codeType}-sourceCode.zip`
            const putObjectCommand = new PutObjectCommand({
                Bucket: String(process.env.S3_BUCKET_NAME),
                Key: sourceCodePath,
                Body: bufferedSourceCodeFile
            })
            await this.s3Client.send(putObjectCommand)
            Logger.info(this.constructor.name, this.saveSourceCode.name, "put object command executed with success")
            return sourceCodePath
        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveSourceCode.name, `put object command throw ${error.message}`)
            throw new S3Exception()
        }
    }

    async saveBackendSourceCode(saveBackendSourceCodeInput: SaveBackendSourceCodeInput): Promise<DeployModelEntity> {
        const backendSourceCodePath = await this.saveSourceCode(
            saveBackendSourceCodeInput.ownerEmail,
            saveBackendSourceCodeInput.deployModelId,
            saveBackendSourceCodeInput.codeType,
            saveBackendSourceCodeInput.bufferedSourceCodeFile
        )

        try {
            Logger.info(this.constructor.name, this.saveBackendSourceCode.name, "saving source code path")
            await this.prismaClient.$connect()
            const result = await this.prismaClient.deployModel.update({
                where: {id: saveBackendSourceCodeInput.deployModelId},
                data: {
                    backendSourceCodePath: backendSourceCodePath
                }
            })

            Logger.info(this.constructor.name, this.saveBackendSourceCode.name, "source code saved with success")
            return new DeployModelEntity(
                result.id,
                result.deployModelName,
                result.deployModelType,
                result.databaseType,
                result.executionEnvironment,
                result.ownerEmail,
                result.frontendSourceCodePath,
                result.backendSourceCodePath,
                result.accessKeyIdPath,
                result.secretAccessKeyPath
            )

        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveBackendSourceCode.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }
}