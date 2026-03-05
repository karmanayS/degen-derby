import { useEffect, useState } from "react";
import { useConnection } from "../utils/ConnectionProvider";
import { useAuthorization } from "../utils/useAuthorization";
import { checkSkrBalance } from "../lib/skr";

export function useSkrStatus() {
  const { connection } = useConnection();
  const { selectedAccount } = useAuthorization();
  const [hasSkr, setHasSkr] = useState(false);
  const [skrBalance, setSkrBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedAccount) {
      setHasSkr(false);
      setSkrBalance(0);
      return;
    }

    const check = async () => {
      setLoading(true);
      const result = await checkSkrBalance(
        connection,
        selectedAccount.publicKey
      );
      setHasSkr(result.hasSkr);
      setSkrBalance(result.balance);
      setLoading(false);
    };

    check();
  }, [selectedAccount, connection]);

  return { hasSkr, skrBalance, loading };
}