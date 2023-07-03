from dotenv import load_dotenv
import os


class ConfigException(Exception):
    pass


class Config:

    def __init__(self) -> None:
        load_dotenv()
        self._get_required_env_var("GOOGLE_APPLICATION_CREDENTIALS")
        self.DEEPGRAM_API_KEY = self._get_required_env_var("DEEPGRAM_API_KEY")
        self.GOOGLE_TRANSLATE_PARENT_DIRECTORY = f"projects/{self._get_required_env_var('PROJECT_ID')}/locations/global"
        self.OPENAI_API_KEY = self._get_required_env_var("GPT_KEY")
        self.AZURE_SPEECH_REGION = self._get_required_env_var("SPEECH_REGION")
        self.AZURE_SPEECH_API_KEY = self._get_required_env_var("SPEECH_KEY")

    @staticmethod
    def _get_required_env_var(var: str) -> str:
        if var not in os.environ:
            raise ConfigException(f"Please set the {var} environment variable")
        return os.environ[var]

    def __new__(cls, *args, **kwargs):
        if not hasattr(cls, 'instance'):
            cls.instance = super(Config, cls).__new__(cls)
        return cls.instance
