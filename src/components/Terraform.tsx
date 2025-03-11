import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import MonacoEditor from "@monaco-editor/react";
import Split from "react-split";

interface Resource {
  id: string;
  name: string;
  fields: string[];
  image: string; // Added image property
}

const resources: Record<string, Resource[]> = {
  AWS: [
    { id: "aws_ec2", name: "AWS EC2", fields: ["ami", "instance_type", "tags"], image: "/aws-ec2.png" },
    { id: "aws_s3", name: "AWS S3", fields: ["bucket_name", "region"], image: "/aws-s3.png" },
    { id: "aws_rds", name: "AWS RDS", fields: ["db_name", "instance_class"], image: "/aws-rds.png" },
  ],
  OpenStack: [
    { id: "openstack_compute", name: "OpenStack Compute", fields: ["flavor", "image"], image: "/openstack-compute.png" },
    { id: "openstack_network", name: "OpenStack Network", fields: ["cidr", "subnet"], image: "/openstack-network.png" },
  ],
  Docker: [
    { id: "docker_container", name: "Docker Container", fields: ["image", "ports"], image: "/docker-container.png" },
    { id: "docker_network", name: "Docker Network", fields: ["driver"], image: "/docker-network.png" },
  ],
};

export default function Terraform() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") === "dark");
  const [selectedCategory, setSelectedCategory] = useState("AWS");
  const [droppedResources, setDroppedResources] = useState<any[]>([]);
  const [terraformCode, setTerraformCode] = useState<string>("");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Clear dropped resources when category changes
  useEffect(() => {
    setDroppedResources([]);
  }, [selectedCategory]);

  const handleDragEnd = (event: any) => {
    const { active } = event;
    const resource = resources[selectedCategory].find((r) => r.id === active.id);
    if (resource) {
      setDroppedResources([...droppedResources, { ...resource, values: {} }]);
    }
  };

  const updateResourceValue = (index: number, key: string, value: string) => {
    const updatedResources = [...droppedResources];
    updatedResources[index].values[key] = value;
    setDroppedResources(updatedResources);
  };

  useEffect(() => {
    generateTerraformCode();
  }, [droppedResources, selectedCategory]);

  const generateTerraformCode = () => {
    let code = `terraform {
  required_providers {
    ${selectedCategory.toLowerCase()} = {
      source  = "hashicorp/${selectedCategory.toLowerCase()}"
      version = "~> 4.16"
    }
  }
  required_version = ">= 1.2.0"
}\n\nprovider "${selectedCategory.toLowerCase()}" {}\n\n`;

    droppedResources.forEach((res) => {
      code += `resource "${res.id}" "${res.id}_resource" {\n`;
      Object.entries(res.values).forEach(([key, value]) => {
        code += `  ${key} = "${value}"\n`;
      });
      code += `}\n\n`;
    });

    setTerraformCode(code);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Terraform Visualizer
        </h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>

      <Split className="flex flex-1" sizes={[20, 50, 30]} minSize={[200, 400, 200]} gutterSize={10} snapOffset={30}>
        {/* Left Panel */}
        <aside className="bg-gray-200 dark:bg-gray-800 p-4 overflow-y-auto">
          <h2 className="font-semibold text-gray-700 dark:text-gray-300">Resources</h2>
          <select
            className="w-full p-2 mt-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border rounded"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {Object.keys(resources).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            {resources[selectedCategory].map((resource) => (
              <DraggableItem key={resource.id} id={resource.id} name={resource.name} image={resource.image} />
            ))}
          </DndContext>
        </aside>

        {/* Center Panel */}
        <main className="bg-white dark:bg-gray-700 p-4 border-l border-r">
          <h2 className="text-gray-700 dark:text-gray-200 mb-4">Workspace</h2>
          <DroppableArea>
            {droppedResources.map((res, index) => (
              <div key={index} className="p-2 bg-blue-500 text-white rounded mt-2 flex items-center">
                <img src={res.image} alt={res.name} className="w-8 h-8 mr-2" />
                {res.name}
              </div>
            ))}
          </DroppableArea>
        </main>

        {/* Right Panel */}
        <aside className="bg-gray-200 dark:bg-gray-800 p-4 flex flex-col">
          <div className="flex-1 overflow-auto">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Terraform Code</h2>
            <MonacoEditor
              height="300px"
              theme={darkMode ? "vs-dark" : "light"}
              defaultLanguage="hcl"
              value={terraformCode}
              options={{ readOnly: false, scrollBeyondLastLine: false }}
              onChange={(code) => setTerraformCode(code || "")}
            />
            
            {droppedResources.length > 0 && (
              <div className="mt-4">
                <h2 className="font-semibold text-gray-700 dark:text-gray-300">Resource Inputs</h2>
                <div className="overflow-y-auto max-h-96">
                  {droppedResources.map((res, index) => (
                    <div key={index} className="p-2 bg-gray-300 dark:bg-gray-600 rounded mt-2">
                      <div className="flex items-center mb-2">
                        <img src={res.image} alt={res.name} className="w-10 h-8 mr-2" />
                        <h3 className="text-lg font-bold">{res.name}</h3>
                      </div>
                      {res.fields.map((field: string) => (
                        <input
                          key={field}
                          type="text"
                          placeholder={field}
                          className="w-full p-1 mt-1 bg-white dark:bg-gray-700 border rounded"
                          onChange={(e) => updateResourceValue(index, field, e.target.value)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </Split>
    </div>
  );
}

function DraggableItem({ id, name, image }: { id: string; name: string; image: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="p-2 my-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded cursor-pointer flex items-center"
    >
      <img src={image} alt={name} className="w-12 h-12 mr-4" />
      {name}
    </div>
  );
}

function DroppableArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "dropzone" });

  return (
    <div ref={setNodeRef} className="min-h-[400px] border-dashed border-2 border-gray-500 dark:border-gray-300 p-4 rounded-lg">
      {children || <div className="text-gray-500 dark:text-gray-400 text-center">Drop resources here</div>}
    </div>
  );
}