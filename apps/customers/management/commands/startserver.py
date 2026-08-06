from django.core.management import call_command
from django.core.management.commands.runserver import Command as RunserverCommand
from django.db.migrations.executor import MigrationExecutor
from django.db import connections, DEFAULT_DB_ALIAS


class Command(RunserverCommand):
    help = "Checks for unapplied migrations, applies them, then starts the development server."

    def execute(self, *args, **options):
        self.check_and_apply_migrations()
        return super().execute(*args, **options)

    def check_and_apply_migrations(self):
        connection = connections[DEFAULT_DB_ALIAS]
        connection.prepare_database()
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())

        if not plan:
            self.stdout.write(self.style.SUCCESS("No unapplied migrations."))
            return

        self.stdout.write(
            self.style.WARNING(f"Found {len(plan)} unapplied migration(s). Applying now...")
        )
        call_command("migrate")
        self.stdout.write(self.style.SUCCESS("Migrations applied."))
