import {
    CreateDeployModelDtoInput,
    CreateDeployModelDtoOutput,
    CreateDeployModelUseCase
} from "../use-case/CreateDeployModelUseCase";
import {HttpRequest} from "../util/HttpRequest";
import {ApiStatusCode, HttpResponse} from "../util/HttpResponse";
import {DeployModelDoesNotExistException} from "../exception/DeployModelDoesNotExistException";
import {
    UploadSourceCodeDtoInput, UploadSourceCodeDtoOutput,
    UploadSourceCodeUseCase
} from "../use-case/UploadSourceCodeUseCase";
import {
    SaveAwsCredentialsDtoInput,
    SaveAwsCredentialsDtoOutput,
    SaveAwsCredentialsUseCase
} from "../use-case/SaveAwsCredentialsUseCase";
import {
    CreateDeployModelInfraDtoInput,
    CreateDeployModelInfraDtoOutput,
    CreateDeployModelInfraUseCase
} from "../use-case/CreateDeployModelInfraUseCase";
import {AwsCredentialsConfigurationMissingException} from "../exception/AwsCredentialsConfigurationMissingException";

export class DeployModelController {
    constructor(
        private createDeployModelUseCase: CreateDeployModelUseCase,
        private uploadSourceCodeUseCase: UploadSourceCodeUseCase,
        private saveAwsCredentialsUseCase: SaveAwsCredentialsUseCase,
        private createDeployModelInfraUseCase: CreateDeployModelInfraUseCase
    ) {
    }

    async createDeployModel(httpRequest: HttpRequest<CreateDeployModelDtoInput>): Promise<HttpResponse<CreateDeployModelDtoOutput | null>> {
        try {
            const createDeployModelDtoOutput = await this.createDeployModelUseCase.execute(httpRequest.data)
            return HttpResponse.created("Deploy model created with success", createDeployModelDtoOutput)
        } catch (error: any) {
            return HttpResponse.internalServerError()
        }
    }

    async uploadSourceCode(httpRequest: HttpRequest<UploadSourceCodeDtoInput>): Promise<HttpResponse<UploadSourceCodeDtoOutput | null>> {
        try {
            const uploadSourceCodeDtoOutput = await this.uploadSourceCodeUseCase.execute(httpRequest.data)
            return HttpResponse.ok("upload executed with success", uploadSourceCodeDtoOutput)
        } catch (error: any) {
            if (error instanceof DeployModelDoesNotExistException) {
                return HttpResponse.badRequest(ApiStatusCode.DEPLOY_MODEL_DOES_NOT_EXIST, error.message, null)
            }

            if (error instanceof AwsCredentialsConfigurationMissingException) {
                return HttpResponse.badRequest(ApiStatusCode.AWS_CREDENTIALS_CONFIGURATION_MISSING, error.message, null)
            }

            return HttpResponse.internalServerError()
        }
    }

    async saveAwsCredentials(httpRequest: HttpRequest<SaveAwsCredentialsDtoInput>): Promise<HttpResponse<SaveAwsCredentialsDtoOutput | null>> {
        try {
            const saveAwsCredentialsDtoOutput = await this.saveAwsCredentialsUseCase.execute(httpRequest.data)
            return HttpResponse.ok("aws credentials saved with success", saveAwsCredentialsDtoOutput)

        } catch (error: any) {
            if (error instanceof DeployModelDoesNotExistException) {
                return HttpResponse.badRequest(ApiStatusCode.DEPLOY_MODEL_DOES_NOT_EXIST, error.message, null)
            }

            return HttpResponse.internalServerError()
        }
    }

    async createDeployModelInfra(httpRequest: HttpRequest<CreateDeployModelInfraDtoInput>): Promise<HttpResponse<CreateDeployModelInfraDtoOutput | null>> {
        try {
            const createDeployModelInfraDtoOutput = await this.createDeployModelInfraUseCase.execute(httpRequest.data)
            return HttpResponse.ok("deploy model infra created with success", createDeployModelInfraDtoOutput)

        } catch (error: any) {
            if (error instanceof DeployModelDoesNotExistException) {
                return HttpResponse.badRequest(ApiStatusCode.DEPLOY_MODEL_DOES_NOT_EXIST, error.message, null)
            }

            if (error instanceof AwsCredentialsConfigurationMissingException) {
                return HttpResponse.badRequest(ApiStatusCode.AWS_CREDENTIALS_CONFIGURATION_MISSING, error.message, null)
            }

            return HttpResponse.internalServerError()
        }
    }
}