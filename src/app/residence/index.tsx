import { useRouter } from "expo-router";
import { Building, Plus } from "lucide-react-native";
import { View } from "react-native";
import { ACVELButton, QueryView, Screen } from "@/components";
import { ResidenceCard } from "@/features/residences/components/ResidenceCard";
import { useResidences } from "@/features/residences/hooks/useResidences";
import { useRefreshControl } from "@/hooks/useRefreshControl";
import { routes } from "@/navigation/routes";
import { useTheme } from "@/theme";

export default function ResidencesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const residences = useResidences();
  const refresh = useRefreshControl(residences);
  const addUnit = () => router.push(routes.newResidence);

  return (
    <Screen {...refresh} footer={residences.data && residences.data.length > 0 ? <ACVELButton label="Adicionar unidade" icon={Plus} onPress={addUnit} /> : undefined}>
      <QueryView
        query={residences}
        loading="cards"
        loadingRows={3}
        isEmpty={(list) => list.length === 0}
        empty={{
          icon: Building,
          title: "Nenhuma unidade cadastrada",
          message: "Cadastre a conta de luz do seu imóvel para começar a receber energia limpa com desconto.",
          action: { label: "Cadastrar unidade", icon: Plus, onPress: addUnit }
        }}
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((residence) => (
              <ResidenceCard key={residence.id} residence={residence} onPress={() => router.push(routes.residence(residence.id))} />
            ))}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}
