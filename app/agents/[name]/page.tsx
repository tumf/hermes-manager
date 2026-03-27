import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';

interface AgentPageProps {
  params: Promise<{ name: string }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { name } = await params;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">{name}</h1>
      <Tabs defaultValue="memory">
        <TabsList>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="env">Env</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="memory">
          <div className="text-muted-foreground mt-4 rounded-md border p-4 text-sm">
            Memory — coming soon
          </div>
        </TabsContent>
        <TabsContent value="config">
          <div className="text-muted-foreground mt-4 rounded-md border p-4 text-sm">
            Config — coming soon
          </div>
        </TabsContent>
        <TabsContent value="env">
          <div className="text-muted-foreground mt-4 rounded-md border p-4 text-sm">
            Env — coming soon
          </div>
        </TabsContent>
        <TabsContent value="skills">
          <div className="text-muted-foreground mt-4 rounded-md border p-4 text-sm">
            Skills — coming soon
          </div>
        </TabsContent>
        <TabsContent value="logs">
          <div className="text-muted-foreground mt-4 rounded-md border p-4 text-sm">
            Logs — coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
