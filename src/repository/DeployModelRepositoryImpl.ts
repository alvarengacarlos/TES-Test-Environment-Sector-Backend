import {PrismaClient} from "@prisma/client";
import {CloudFormationClient, CreateStackCommand, DeleteStackCommand} from "@aws-sdk/client-cloudformation";
import {PutObjectCommand, GetObjectCommand, S3Client} from "@aws-sdk/client-s3";

import {
    DeployModelRepository, FindDeployModelByIdInput, SaveAwsCredentialsInput,
    SaveSourceCodeInput,
    SaveDeployModelInput, CreateDeployModelInfraInput,
} from "./DeployModelRepository";
import {Logger} from "../util/Logger";
import {DeployModelEntity} from "../entity/DeployModelEntity";
import {DatabaseException} from "../exception/DatabaseException";
import {S3Exception} from "../exception/S3Exception";
import {CreateSecretCommand, GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";
import {SecretsManagerException} from "../exception/SecretsManagerException";
import {CloudFormationException} from "../exception/CloudFormationException";
import {getCloudFormationClientWithCredentials} from "../infra/cloudFormationClient";
import {AwsCredentialsEntity} from "../entity/AwsCredentialsEntity";

export class DeployModelRepositoryImpl implements DeployModelRepository {

    constructor(
        private readonly prismaClient: PrismaClient,
        private readonly s3Client: S3Client,
        private readonly secretsManagerClient: SecretsManagerClient,
        private readonly getCloudFormationClient = getCloudFormationClientWithCredentials
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
                result.ownerEmail,
                result.sourceCodePath,
                result.awsCredentialsPath
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
                result.ownerEmail,
                result.sourceCodePath,
                result.awsCredentialsPath
            )

        } catch (error: any) {
            Logger.error(this.constructor.name, this.findDeployModelById.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }

    async saveSourceCode(saveSourceCodeInput: SaveSourceCodeInput): Promise<DeployModelEntity> {
        const sourceCodePath = await this.uploadSourceCode(
            saveSourceCodeInput.ownerEmail,
            saveSourceCodeInput.deployModelId,
            saveSourceCodeInput.bufferedSourceCodeFile
        )

        try {
            Logger.info(this.constructor.name, this.saveSourceCode.name, "saving source code path")
            await this.prismaClient.$connect()
            const result = await this.prismaClient.deployModel.update({
                where: {id: saveSourceCodeInput.deployModelId},
                data: {
                    sourceCodePath: sourceCodePath,
                }
            })

            Logger.info(this.constructor.name, this.saveSourceCode.name, "source code saved with success")
            return new DeployModelEntity(
                result.id,
                result.deployModelName,
                result.ownerEmail,
                result.sourceCodePath,
                result.awsCredentialsPath
            )

        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveSourceCode.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }

    private async uploadSourceCode(ownerEmail: string, deployModelId: string, bufferedSourceCodeFile: Buffer): Promise<string> {
        try {
            Logger.info(this.constructor.name, this.saveSourceCode.name, "executing put object command")
            const sourceCodePath = `sourceCode/${ownerEmail}-${deployModelId}-sourceCode.zip`
            const putObjectCommand = new PutObjectCommand({
                Bucket: String(process.env.S3_BUCKET_NAME),
                Key: sourceCodePath,
                Body: bufferedSourceCodeFile
            })
            await this.s3Client.send(putObjectCommand)
            Logger.info(this.constructor.name, this.saveSourceCode.name, "put object command executed with success")
            return sourceCodePath
        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveSourceCode.name, `S3 client throw ${error.message}`)
            throw new S3Exception()
        }
    }

    async saveAwsCredentials(saveAwsCredentialsInput: SaveAwsCredentialsInput): Promise<DeployModelEntity> {
        const awsCredentialsPath = `${saveAwsCredentialsInput.ownerEmail}-${saveAwsCredentialsInput.deployModelId}-awsCredentials`
        const awsCredentials = JSON.stringify({
            accessKeyId: saveAwsCredentialsInput.accessKeyId,
            secretAccessKey: saveAwsCredentialsInput.secretAccessKey
        })
        await this.saveSecrets(awsCredentialsPath, awsCredentials)

        try {
            Logger.info(this.constructor.name, this.saveAwsCredentials.name, `saving aws credentials path`)

            await this.prismaClient.$connect()
            const result = await this.prismaClient.deployModel.update({
                where: {id: saveAwsCredentialsInput.deployModelId},
                data: {
                    awsCredentialsPath: awsCredentialsPath
                }
            })

            Logger.info(this.constructor.name, this.saveAwsCredentials.name, `aws credentials path saved with success`)
            return new DeployModelEntity(
                result.id,
                result.deployModelName,
                result.ownerEmail,
                result.sourceCodePath,
                result.awsCredentialsPath
            )

        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveAwsCredentials.name, `Prisma client throw ${error.message}`)
            throw new DatabaseException()

        } finally {
            await this.prismaClient.$disconnect()
        }
    }

    private async saveSecrets(name: string, secret: string) {
        try {
            Logger.info(this.constructor.name, this.saveSecrets.name, `executing create secret command`)
            const createSecretCommand = new CreateSecretCommand({
                Name: name,
                SecretString: secret,
            })
            await this.secretsManagerClient.send(createSecretCommand)
            Logger.info(this.constructor.name, this.saveSecrets.name, `create secret command executed with success`)
        } catch (error: any) {
            Logger.error(this.constructor.name, this.saveSecrets.name, `Secrets manager client throw ${error.message}`)
            throw new SecretsManagerException()
        }
    }

    async createDeployModelInfra(createDeployModelInfraInput: CreateDeployModelInfraInput): Promise<void> {
        const awsCredentials = await this.findAwsCredentials(createDeployModelInfraInput.awsCredentialsPath)
        const cloudFormationClient = this.getCloudFormationClient(awsCredentials.accessKeyId, awsCredentials.secretAccessKey)
        const templateBody = await this.findTemplateUrl()
        const stackName = `container-model-${createDeployModelInfraInput.deployModelId}`

        try {
            Logger.info(this.constructor.name, this.createDeployModelInfra.name, `executing create stack command`)
            const createStackCommand = new CreateStackCommand({
                StackName: stackName,
                TemplateBody: templateBody
            })

            await cloudFormationClient.send(createStackCommand)
            Logger.info(this.constructor.name, this.createDeployModelInfra.name, `create stack command executed with success`)
        } catch (error: any) {
            Logger.error(this.constructor.name, this.createDeployModelInfra.name, `CloudFormation client throw ${error.message}`)
            await this.deleteDeployModelInfra(stackName, cloudFormationClient)
            throw new CloudFormationException()
        }
    }

    private async findAwsCredentials(awsCredentialsPath: string): Promise<AwsCredentialsEntity> {
        try {
            Logger.info(this.constructor.name, this.findAwsCredentials.name, "executing get secret value command")
            const getSecretValueCommand = new GetSecretValueCommand({
                SecretId: awsCredentialsPath
            })
            const output = await this.secretsManagerClient.send(getSecretValueCommand)

            Logger.info(this.constructor.name, this.findAwsCredentials.name, "get secret value command executed with success")
            const awsCredentials = JSON.parse(String(output?.SecretString))

            return new AwsCredentialsEntity(awsCredentials.accessKeyId, awsCredentials.secretAccessKey)
        } catch (error: any) {
            Logger.error(this.constructor.name, this.findAwsCredentials.name, `Secrets Manager client throw ${error.message}`)
            throw new SecretsManagerException()
        }
    }

    private async findTemplateUrl(): Promise<string> {
        try {
            Logger.info(this.constructor.name, this.findTemplateUrl.name, `executing get object command`)
            const getObjectCommand = new GetObjectCommand({
                Bucket: String(process.env.S3_BUCKET_NAME),
                Key: "ContainerModel.yaml"
            })

            const output = await this.s3Client.send(getObjectCommand)

            Logger.info(this.constructor.name, this.findTemplateUrl.name, `get object command executed with success`)
            return String(await output.Body?.transformToString())
        } catch (error: any) {
            Logger.error(this.constructor.name, this.findTemplateUrl.name, `S3 client throw ${error.message}`)
            throw new S3Exception()
        }
    }

    private async deleteDeployModelInfra(stackName: string, cloudFormationClient: CloudFormationClient) {
        try {
            Logger.info(this.constructor.name, this.deleteDeployModelInfra.name, `executing delete stack command`)
            const deleteStackCommand = new DeleteStackCommand({
                StackName: stackName,
            })

            await cloudFormationClient.send(deleteStackCommand)
            Logger.info(this.constructor.name, this.deleteDeployModelInfra.name, `delete stack command executed with success`)
        } catch (error: any) {
            Logger.error(this.constructor.name, this.deleteDeployModelInfra.name, `CloudFormation client throw ${error.message}`)
            throw new CloudFormationException()
        }
    }
}